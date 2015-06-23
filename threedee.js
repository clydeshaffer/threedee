var cnvs = document.getElementById("myCanvas");
cnvs.width = window.innerWidth;
cnvs.height = window.innerHeight;


var ctx = cnvs.getContext("2d");
var buffer = ctx.createImageData(cnvs.width, cnvs.height);
var depthBuffer = new Float32Array(cnvs.width * cnvs.height);
var framerate = 30; //Reports, does not control framerate

//////UTILS 

Array.prototype.map = function(mapFunc) {
	var newArray = [];
	for(var i = 0; i < this.length; i ++) {
		newArray[i] = mapFunc(this[i]);
	}
	return newArray;
}

Array.prototype.reduce = function(reduceFunc, initial) {
	var counter = initial;
	for(var i = 0; i < this.length; i++) {
		counter = reduceFunc(counter, this[i]);
	}
	return counter;
}

Array.prototype.filter = function(filterFunc) {
	var newArray = [];
	for(var i = 0; i < this.length; i ++) {
		if(filterFunc(this[i])) newArray.push(this[i]);
	}
	return newArray;
}


///////////////////////////MATH, VECTORS, QUATERNIONS

var twoPi = Math.PI * 2;
var piOverTwo = Math.PI / 2;

var sign = function(x) {
	if(x > 0) return 1;
	if(x < 0) return -1;
	return 0;
};

var clipSign = function(x) {
	if(x > 1) return 1;
	if(x < -1) return -1;
	return x;
}

var sqr = function(x) {
 return x * x;
};

var angleWrap = function (ang) {
	var x = ang + Math.PI;
	x = x % (twoPi);
	return x - Math.PI;
};

var fastSine = function(ang) {
	var wrappedAng = angleWrap(ang);
	var B = 1.2732395; // 4/pi
	var C = -0.40528473; // -4 / (pi²)
	
	return B * wrappedAng + C * wrappedAng * wrappedAng * sign(wrappedAng);
};

var fastCosine = function(ang) {
	return fastSine(ang + (piOverTwo));
};


var vector = function (x, y, z) {
    return {
        x: x,
        y: y,
        z: z
    };
};

var origin = vector(0, 0, 0);

var sqrDist = function (a, b) {
    return sqr(b.x - a.x) + sqr(b.y - a.y) + sqr(b.z - a.z);
};

var diff = function (a, b) {
    return vector(b.x - a.x, b.y - a.y, b.z - a.z);
};

var sum = function (a, b) {
    return vector(a.x + b.x, a.y + b.y, a.z + b.z);
};

var scale = function (v, factor) {
    return vector(
    v.x * factor,
    v.y * factor,
    v.z * factor);
};

var scale3D = function(v, vscale) {
	return vector(
	v.x * vscale.x,
	v.y * vscale.y,
	v.z * vscale.z);
};

var normalize = function (v) {
    return scale(v, 1 / Math.sqrt(sqrDist(v, origin)));
};

var dot = function (a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
};

var cross = function(a, b) {
 return vector(
 		a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x);
};



var floorVec = function(v) {
	return vector(Math.round(v.x), Math.round(v.y), Math.round(v.z));
};

var isPointInTriangle = function(P, A, B, C) {
// Compute vectors        
var v0 = diff(A, C);
var v1 = diff(A, B);
var v2 = diff(A, P);

// Compute dot products
var dot00 = dot(v0, v0);
var dot01 = dot(v0, v1);
var dot02 = dot(v0, v2);
var dot11 = dot(v1, v1);
var dot12 = dot(v1, v2);

// Compute barycentric coordinates
var invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
var v = (dot00 * dot12 - dot01 * dot02) * invDenom;

// Check if point is in triangle
  return (u >= 0) && (v >= 0) && (u + v < 1);
};

var quaternion = function(w, x, y, z) {
	return {
        x: x,
        y: y,
        z: z,
        w: w
    };
};

var bounds = function(x, y, width, height) {
	return {
		x : x,
		y : y,
		width : width,
		height : height
	};
};

var triangleBounds = function(A, B, C) {
	var result =  {
		x : Math.min(A.x, B.x, C.x) - 1,
		y : Math.min(A.y, B.y, C.y) - 1
	};
	
	result.width = Math.max(A.x, B.x, C.x) - result.x + 2;
	result.height = Math.max(A.y, B.y, C.y) - result.y + 2;
	return result;
};

var doBoundsOverlap = function(A, B) {
	if(A.x > (B.x + B.width)) return false;
	if(B.x > (A.x + A.width)) return false;
	if(A.y > (B.y + B.height)) return false;
	if(B.y > (A.y + A.height)) return false;
	return true;
};

var rotateVec = function (vec, quat) {
	var temp = scale(cross(vector(quat.x, quat.y, quat.x), vec), 2);
	return sum(vec, sum(scale(temp, quat.w), cross(vector(quat.x, quat.y, quat.x), temp)));
};

var quaternionMultiply = function(q, r) {
	return quaternion(
		r.x * q.x - r.y * q.y * r.z * q.z - r.w * q.w,
		r.x * q.y + r.y * q.x - r.z * q.w + r.w * q.z,
		r.x * q.z + r.y * q.w + r.z * q.x - r.w * q.y,
		r.x * q.w - r.y * q.z + r.z * q.y + r.w * q.x
	);
};

var quaternionFromEuler = function(angles) {
	var c1 = fastCosine(angles.y / 2);
	var c2 = fastCosine(angles.x / 2);
	var c3 = fastCosine(angles.z / 2);
	var s1 = fastSine(angles.y / 2);
	var s2 = fastSine(angles.x / 2);
	var s3 = fastSine(angles.z / 2);
	return quaternion(
		c1 * c2 * c3 - s1 * s3 * s3,
		s1 * s2 * c3 + c1 * c2 * s3,
		s1 * c2 * c3 + c1 * s2 * s3,
		c1 * s2 * c3 - s1 * c2 * s3
	);
};

///////////////////////////CAMERA, RENDERING MATH

var camera = {
    pos: {
        x: 0,
        y: 0,
        z: 0
    },
    forward: {
        x: 0,
        y: 0,
        z: 1
    },
    right: {
        x: 1,
        y: 0,
        z: 0
    },
    up: {
        x: 0,
        y: 1,
        z: 0
    },
    fov: Math.PI / 3
};

var setCameraToEulerAngles = function(angles) {
	var rotQ = quaternionFromEuler(angles);
	camera.forward = normalize(rotateVec(vector(0, 0, 1), rotQ));
	camera.right = normalize(rotateVec(vector(1, 0, 0), rotQ));
	camera.up = normalize(rotateVec(vector(0, 1, 0), rotQ));
}

var lastFov = camera.fov;
var lastFovFactor = fastCosine((Math.PI - camera.fov) / 2);;
var xFactor = (cnvs.width / 2) / lastFovFactor;
var yFactor = (cnvs.width / 2) / lastFovFactor;

var xOffset = (cnvs.width / 2);
var yOffset = (cnvs.height / 2);

function worldToScreen(v) {

    if(camera.fov != lastFov) {
   		lastFovFactor = fastCosine((Math.PI - camera.fov) / 2);
	   	lastFov = camera.fov;
   		xFactor = (cnvs.width / 2) / lastFovFactor;
	  	yFactor = (cnvs.width / 2) / lastFovFactor;
	    xOffset = (cnvs.width / 2);
		yOffset = (cnvs.height / 2);
    } 
    
    var fovFactor = lastFovFactor;
    

    var dirToPoint = normalize(diff(v, camera.pos));

    var xdot = dot(dirToPoint, camera.right) * -1;
    var ydot = dot(dirToPoint, camera.up);
    
    if (dot(dirToPoint, camera.forward) >= 0) return {
        x: (1000000 * sign(xdot)) + xOffset,
        y: (1000000 * sign(ydot)) + yOffset
    };

    return {
        x: xdot * xFactor + xOffset,
        y: ydot * yFactor + yOffset
    };
}

//Used for buffer Triangle draw
function indexToPixel(i) {
	return vector(i % cnvs.width, Math.floor(i / cnvs.width), 0);
}

function threedee(x, y, z, f) {
    var transformedPoint = worldToScreen(vector(x,y,z));
    
    //integer pixel optimization
	transformedPoint.z = 0;
	transformedPoint = floorVec(transformedPoint);
    
    f.call(ctx, transformedPoint.x, transformedPoint.y);
}


var showBuffer = function() {
	ctx.putImageData(buffer,0,0);
};

var clearDepthBuffer = function() {
	for(var i = 0; i < cnvs.width * cnvs.height; i++) {
		depthBuffer[i] = 100000000;
	}
};

var clearColorBuffer = function() {
	for(var i = 0; i < cnvs.width * cnvs.height; i++) {
		buffer.data[i*4 + 0] = 0;
		buffer.data[i*4 + 1] = 0;
		buffer.data[i*4 + 2] = 0;
		buffer.data[i*4 + 3] = 0;
	}
};

//////////////////////////COLOR CONVERTERS

function colorToVec (colorStr) {

	var R = parseInt(colorStr.substring(1, 3), 16);
	var G = parseInt(colorStr.substring(3, 5), 16);
	var B = parseInt(colorStr.substring(5, 7), 16);
	return vector(R, G, B);
}

function twoDigify (numStr) {
	if(numStr.length == 1) return "0" + numStr;
	return numStr;
}

function vecToColor(rgbVec) {
	var R = Math.min(Math.max(Math.round(rgbVec.x), 0), 255);
	var G = Math.min(Math.max(Math.round(rgbVec.y), 0), 255);
	var B = Math.min(Math.max(Math.round(rgbVec.z), 0), 255);
	return "#" + twoDigify(R.toString(16)) + twoDigify(G.toString(16)) + twoDigify(B.toString(16));
}

function quantizeVec(rgbVec, factor) {
	return vector(
		Math.round(rgbVec.x / factor) * factor,
		Math.round(rgbVec.y / factor) * factor,
		Math.round(rgbVec.z / factor) * factor
	);
}
///////////////////////////MODELS

function Transform() {
	this.pos = vector(0,0,0);
	this.rot = vector(1,0,0,0);
	this.scale = vector(1,1,1);
}

Transform.prototype.transformPoint = function(v) {
    return sum(rotateVec(scale3D(v, this.scale), this.rot), this.pos);
};

//Lazy bucket sort that uses a hash and doesn't finish what it starts
//get a job, mostlySort!
function mostlySort(arr) {
	var least = Infinity;
	var most = -Infinity;
	var buckets = [];
	for(var i = 0; i < arr.length; i++) {
		if(arr[i][4] > most) most = arr[i][4];
		if(arr[i][4] < least) least = arr[i][4];
	}
	
	var sizeFactor = 1;
	
	
	var toBucketIndex = function(dist) {
		return (arr.length / sizeFactor) - (Math.round((dist - least) * ((arr.length / sizeFactor) - 1) / (most - least)) + 1);
	};
	
	var safePush = function(index, val) {
		if(buckets[index] === undefined) buckets[index] = [val];
		else buckets[index].push(val);
	};
	
	for(var i = 0; i < arr.length; i ++) {
		safePush(toBucketIndex(arr[i][4]),arr[i]);
	};
	
	var sortedArr = [];
	
	for(var i = 0; i < buckets.length; i ++) {
		if(buckets[i] !== undefined) sortedArr = sortedArr.concat(buckets[i]);
	}
	return sortedArr;
}



function zSortModelTris(model, transform) {
	if(model.mesh != null) {
	
		/*var camDistMapper = function(ta) {
			var tVerts = [model.mesh.verts[ta[0]], model.mesh.verts[ta[1]], model.mesh.verts[ta[2]]];
	        var tDists = tVerts.map(function(v) { return sqrDist(transform.transformPoint(v), camera.pos) });
	      	ta[4] = tDists.reduce(function(a, b) { return a + b}, 0);
		}
		
		var camDistCmp = function(ta, tb) {
	        return tb[4] - ta[4];
	    };*/
		
		var trisLen = model.mesh.tris.length;
		for(var i = 0; i < trisLen; i++) {
			var ta = model.mesh.tris[i];
			var tVerts = [model.mesh.verts[ta[0]], model.mesh.verts[ta[1]], model.mesh.verts[ta[2]]];
	        var tDists = tVerts.map(function(v) { return sqrDist(transform.transformPoint(v), camera.pos) });
	      	ta[4] = tDists.reduce(function(a, b) { return a + b}, 0);
		}
		
		//model.mesh.tris.map(camDistMapper);
	    model.mesh.tris = mostlySort(model.mesh.tris);
    }
}


var lastColor = "";

function finalizeDraw() {
    if(lastColor != "") {
	ctx.fillStyle = lastColor;
	//ctx.strokeStyle = lastColor;
	ctx.fill();
	ctx.fill();
	//ctx.stroke();
    }
}

function triangleNormal(vertA, vertB, vertC) {
	return normalize(cross(diff(vertB, vertA),
    					diff(vertC, vertA)));
}


var quantizeLevel = 8;
//Takes three vectors, draws triangle
function drawTriangle(vertA, vertB, vertC, faceColorVec) {
    var normal = triangleNormal(vertA, vertB, vertC);					
    var mid = scale(sum(sum(vertA, vertB), vertC), 1.0/3.0);
    
    //var closest = [vertA, vertB, vertC].reduce(function(vertA, vertB) { if(sqrDist(camera.pos, vertA) < sqrDist(camera.pos, vertB)) return vertA; else return vertB;});
    
    var dotprod = dot(normal, normalize(diff(mid, camera.pos)));

	
	var color = faceColorVec;
	
	if(faceColorVec.isImage == undefined) {
		color = vecToColor(scale(faceColorVec, Math.floor(dotprod * quantizeLevel) / quantizeLevel));
	}
    
    //var color = faceColor;
    
    if(dotprod > 0.0) {
    
    	
    	if(color !== lastColor) {
    	   	finalizeDraw();
    		lastColor = color;
    		ctx.beginPath();
    	}
		
  	 	threedee(vertA.x, vertA.y, vertA.z, ctx.moveTo);
  	  	threedee(vertB.x, vertB.y, vertB.z, ctx.lineTo);
  	  	threedee(vertC.x, vertC.y, vertC.z, ctx.lineTo);
  	  	threedee(vertA.x, vertA.y, vertA.z, ctx.lineTo);
        
        
        //finalizeDraw();
    } 
}

var drawBufferTriangle = function(vertA, vertB, vertC, faceColor) {
	var normal = triangleNormal(vertA, vertB, vertC);					
    var mid = scale(sum(sum(vertA, vertB), vertC), 1.0/3.0);
    var dotprod = dot(normal, normalize(diff(mid, camera.pos)));
    var color = quantizeVec(scale(colorToVec(faceColor), dotprod), quantizeLevel);
    
    var depth = sqrDist(mid, camera.pos); //TODO: Per-pixel depth
    
    var screenA = worldToScreen(vertA);
    var screenB = worldToScreen(vertB);
    var screenC = worldToScreen(vertC);
    screenA.z = 0;
    screenB.z = 0;
    screenC.z = 0;
    
    var tBounds = triangleBounds(screenA, screenB, screenC);
    
    if(doBoundsOverlap(tBounds, bounds(0, 0, cnvs.width, cnvs.height))) {
    if(dotprod > 0.0) {
  		for(var k = 0; k < Math.round(tBounds.height); k ++) {
			for(var j = 0; j < Math.round(tBounds.width); j++) {
				var i = (cnvs.width * (k + Math.round(tBounds.y)) + (j + Math.round(tBounds.x))) * 4;
				if(i < buffer.data.length && (j + tBounds.x < cnvs.width)) {
	    			if(isPointInTriangle(indexToPixel(i / 4), screenA, screenB, screenC)) {
		    			if(depthBuffer[i / 4] > depth) {
		    				buffer.data[i + 0] = color.x;
			    			buffer.data[i + 1] = color.y;
			    			buffer.data[i + 2] = color.z;
			    			buffer.data[i + 3] = 255;
			    			depthBuffer[i / 4] = depth;
		    			}
			    	}
		    	}
	    	}
		}
    }
    }
};

function drawImage(image, pos, size) {
    //Reset line drawing stuff
    finalizeDraw();
    lastColor = "";
    
    var corner = pos;
    corner = sum(corner, scale(camera.right, size / -2));
    corner = sum(corner, scale(camera.up, 0.5 * size));
    var otherCorner = sum(corner, scale(camera.right, size));
    var cornerScreen = worldToScreen(corner);
    var otherCornerScreen = worldToScreen(otherCorner);
    cornerScreen.z = 0; otherCornerScreen.z = 0;
    var sizeOnScreen = Math.sqrt(sqrDist(cornerScreen, otherCornerScreen));
    ctx.drawImage(image ,cornerScreen.x, cornerScreen.y, sizeOnScreen, sizeOnScreen);
}

//////

var useBuffer = false;
var periodicSort = false;

function renderModel(model, transform) {
    if(model.mesh != null) {
    
    var doSort = !periodicSort;
    
    if(!useBuffer) {
   		if(model.mesh.renderParity == undefined) model.mesh.renderParity = 0;
	    model.mesh.renderParity ++;
	    if(model.mesh.renderParity > framerate / 2) {
	    	model.mesh.renderParity -= framerate / 2;
			doSort = true;
	    }
    }
    
    if(doSort) zSortModelTris(model, transform);
    
    for(triIndex = 0; triIndex < model.mesh.tris.length; triIndex ++) {  
        var color = model.mesh.palette[model.mesh.tris[triIndex][3]];
        
        if(useBuffer) {
     		drawBufferTriangle(transform.transformPoint(model.mesh.verts[model.mesh.tris[triIndex][0]]),
		        transform.transformPoint(model.mesh.verts[model.mesh.tris[triIndex][1]]),
            	transform.transformPoint(model.mesh.verts[model.mesh.tris[triIndex][2]]), color);
                     }
        else {
            drawTriangle(transform.transformPoint(model.mesh.verts[model.mesh.tris[triIndex][0]]),
                transform.transformPoint(model.mesh.verts[model.mesh.tris[triIndex][1]]),
                transform.transformPoint(model.mesh.verts[model.mesh.tris[triIndex][2]]), color);
                     }
    }
    
    }
    
    if(model.image != undefined && model.image != null) {
        drawImage(model.image, transform.pos, model.imageSize);
    }
}

function renderModelSet(sceneObjectArray) {
	if(useBuffer) {
		clearDepthBuffer();
		clearColorBuffer();
	}
	sceneObjectArray.sort(function(a, b) { return sqrDist(b.transform.pos, camera.pos) - sqrDist(a.transform.pos, camera.pos); });
	for(modelIndex = 0; modelIndex < sceneObjectArray.length; modelIndex++) {
		var dotProd = dot(camera.forward, diff(camera.pos, sceneObjectArray[modelIndex].transform.pos));
		if(dotProd > 0) {
			renderModel(sceneObjectArray[modelIndex].model, sceneObjectArray[modelIndex].transform);
		}
	}
	if(useBuffer) {
		showBuffer();
	}
}

var newModel = function (pos) {
    return {
        mesh: {
            verts: [], //vectors, vertex positions local to model
            tris: [], //size-4 arrays, indicies on verts[], [3] is color
            palette: [] //strings, color codes
        },
        pos: pos || vector(0,0,0),
        scale : vector(1,1,1),
        rotation : quaternion(1,0,0,0),
        image : null,
        imageSize : 1
    };
};

var modelFromObjFile = function(inputStr) {
	var lines = inputStr.split("\n");
	var loadedModel = newModel();
	var lineNumber = 0;
	var colorCount = 0;
	var currentColorNumber = -1;
	for(lineNumber = 0; lineNumber < lines.length; lineNumber++) {
		var lineparts = lines[lineNumber].split(" ");
		if(lineparts[0] === "v") {
			loadedModel.mesh.verts.push(vector(parseFloat(lineparts[1]), 
										parseFloat(lineparts[2]),
										parseFloat(lineparts[3])));
		} else if(lineparts[0] === "f") {
			loadedModel.mesh.tris.push([parseInt(lineparts[1]) - 1, parseInt(lineparts[2]) - 1, parseInt(lineparts[3]) - 1, Math.max(0, currentColorNumber)]);
		} else if (lineparts[0] === "usemtl") {
			if(lineparts[1][0] == "#") {
				loadedModel.mesh.palette.push(colorToVec(lineparts[1]));
			} else if(lineparts[1] != "(null)") {
				var patternImg = document.getElementById(lineparts[1]);
				if(patternImg != null) {
					var pattern = ctx.createPattern(patternImg, 'repeat');
					pattern.isImage = true;
					loadedModel.mesh.palette.push(pattern);
				}
			}
			currentColorNumber++;
		}
		
	}
	if(loadedModel.mesh.palette.length == 0) loadedModel.mesh.palette.push(colorToVec("#3333CC"));
	return loadedModel;
}

var modelCacheByURL = [];

var modelFromURL = function (url, callback, skipCache) { 
	
	if(skipCache !== true) {
		if(modelCacheByURL[url] !== undefined) {
			callback(modelCacheByURL[url]);
			return;
		}
	}

	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if(xhr.readyState == 4) {
			var downloadedModel = modelFromObjFile(xhr.responseText);
			if(skipCache !== true) {
				modelCacheByURL[url] = downloadedModel;
			}
			callback(downloadedModel);
		}
	};
	xhr.open("GET",url);
	xhr.send();
}

//////////////////////////////////////////RENDER LOOP
var scene = [];

var lastRender = new Date().getTime();
var renderBackgroundColor = "#FFFFFF";
var renderLoop = function () {
	var deltaTimeMillis = (new Date().getTime() - lastRender);
	lastRender = new Date().getTime();
    
    ctx.fillStyle = renderBackgroundColor;
    ctx.fillRect(0, 0, cnvs.width, cnvs.height);
	lastColor = "";
    renderModelSet(scene);
    finalizeDraw();
    
    //Calc and draw framerate
    ctx.font = "12px Arial";
    framerate = Math.round(1000 / deltaTimeMillis);
    ctx.fillText(framerate, 4, 16);
    
    window.setTimeout(renderLoop, 1);
};


//////////SCENE SETUP

var sceneObjects = [];

function SceneObject(model, initFunc, updateFunc) {
	this.model = model;

	this.transform = new Transform();

	this.props = {};
	this.initFunc = initFunc; //called first frame; passed nothing
	this.updateFunc = updateFunc; //called every frame including first (after init); passed deltaTime, totalTime
	this.initialized = false;
	this.destroyFlag = false;
}

SceneObject.prototype.destroy = function() {
		this.destroyFlag = true;
};

//Imitates Unity3D's Instantiate() :P
//pos and rot default to origin and identity, respectfully
var instantiate = function(sceneObject, pos, rot) {
	sceneObject.transform.pos = pos || vector(0,0,0);
	sceneObject.transform.rot = rot || quaternion(1,0,0,0);
	scene.push(sceneObject);
	sceneObject.initialized = false;
	sceneObjects.push(sceneObject);
}

//////SCENE UPDATE LOOP
var time = 0;
var updateInterval = 50;
var lastUpdate = new Date().getTime();
var maxDeltaTime = 1;
var updateLoop = function () {
	var deltaTime = Math.min(0.001 * (new Date().getTime() - lastUpdate), maxDeltaTime);
	lastUpdate = new Date().getTime();
    time += deltaTime;
    
   	sceneObjects.map(function(currentObj) {
   		if(currentObj.initFunc !== undefined && !currentObj.initialized) {
   			currentObj.initFunc();
   			currentObj.initialized = true;
   		}
   		
   		if(currentObj.updateFunc !== undefined) {
   			currentObj.updateFunc(deltaTime, time);
   		}
   	});
   	
    sceneObjects = sceneObjects.filter(function(currentObj) 
    	{ return !currentObj.destroyFlag; });
   	
    window.setTimeout(updateLoop, updateInterval); //nextFrameDelay);
};

renderLoop();
updateLoop();