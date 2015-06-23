var makeCube = function(size, pos) {

	var cube = newModel();
	
	cube.mesh.verts.push(vector(-size, -size, -size));
	cube.mesh.verts.push(vector(-size, -size, size));
	cube.mesh.verts.push(vector(-size, size, -size));
	cube.mesh.verts.push(vector(-size, size, size));
	cube.mesh.verts.push(vector(size, -size, -size));
	cube.mesh.verts.push(vector(size, -size, size));
	cube.mesh.verts.push(vector(size, size, -size));
	cube.mesh.verts.push(vector(size, size, size));
	console.log(cube.mesh.verts);
	
	cube.mesh.tris = [[0, 1, 2], [1, 3, 2], [0, 6, 4], [0, 2, 6], [4, 6, 5], [6, 7, 5], [1, 5, 7], [1, 7, 3], [2, 3, 6], [7, 6, 3], [4, 1, 0], [4, 5, 1]];
	
	cube.mesh.palette.push(colorToVec("#3333CC"));
	cube.mesh.palette.push(colorToVec("#CC3333"));
	cube.mesh.palette.push(colorToVec("#33CC33"));
	cube.mesh.palette.push(colorToVec("#CCCC33"));
	cube.mesh.palette.push(colorToVec("#33CCCC"));
	cube.mesh.palette.push(colorToVec("#CC33CC"));
	
	
	var colors = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
	
	for(var i = 0; i < 12; i++) {
	    cube.mesh.tris[i][3] = colors[i];
	}
	cube.pos = pos;
	
	return cube;
}


function getQueryVariable(variable)
{
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1];}
       }
       return(false);
}


var adcade = null;
var modelURL = getQueryVariable("model");
if(modelURL == false) modelURL = "http://shibegame.shop.tm/test/adcade.obj";

modelFromURL(modelURL, function(model) { adcade = model; adcade.scale = vector(75,75,75); adcade.pos = vector(0, 0, 500); scene.push(adcade)});

//modelFromURL(modelURL, function(model) { var newMdl = model; newMdl.scale = vector(75,75,75); newMdl.pos = vector(250, 100, 700); scene.push(newMdl)});
//modelFromURL(modelURL, function(model) { var newMdl = model; newMdl.scale = vector(75,75,75); newMdl.pos = vector(-250, 100, 700); scene.push(newMdl)});

var cubeObjs = [];

for(z = 0; z < 5; z ++) {
	var theta = z * Math.PI / 8;
	var newPos = vector(fastCosine(theta) * z * 50, 100 + Math.random() * 50, fastSine(theta) * z * 50);
	//var newPos = vector(Math.random() * 200 - 100, Math.random() * 200, Math.random() * 200 - 100);
	var newCube = makeCube(Math.random() * 4 + 8, newPos);
	scene.push(newCube);
	var newCubeObj = { model : newCube, velocity : vector(0,0,0) }
	cubeObjs.push(newCubeObj);
}

console.log(scene);

var sphere=document.getElementById("sphereImg");

var ball = newModel();
ball.mesh = null;
ball.image = sphere;
ball.imageSize = 20;
ball.pos = vector(33, 0, 500);
scene.push(ball);
var ballObj = { model : ball, velocity : vector(-5, 200, -50) };
cubeObjs.push(ballObj);

var doMouseDown = function(ev) {
    var touchPos = {x : ev.x, y : ev.y };
    var origPan = cameraPan;
    cnvs.onmousemove = function(evt) {
                cameraPan = (evt.x - touchPos.x) / -300 + origPan;
    }
}

cnvs.onmouseup = function(ev) { cnvs.onmousemove = null; };

cnvs.addEventListener("mousedown", doMouseDown, false);

/////////////////////////////////////////UPDATE SHIT

if(adcade != null) { 
   		if(time % (twoPi + 3) < (twoPi)) adcade.rotation = quaternionFromEuler(vector(0, time % (twoPi + 3), 0));
   	}
   
    camera.forward = {
        x: fastSine(cameraPan) * -1,
        y: 0,
        z: fastCosine(cameraPan)
    };
    camera.right = {
        x: fastSine(cameraPan - piOverTwo) * -1,
        y: 0,
        z: fastCosine(cameraPan - piOverTwo)
    };

    //camera.pos = sum(vector(0,0, 0), scale(camera.forward, -1 * 200));

	for(var objIndex = 0; objIndex < cubeObjs.length; objIndex ++) {
		cubeObjs[objIndex].model.pos = sum(cubeObjs[objIndex].model.pos, scale(cubeObjs[objIndex].velocity, deltaTime));
		
		if(cubeObjs[objIndex].model.pos.y < -25) {
			cubeObjs[objIndex].velocity.y *= -1;
			cubeObjs[objIndex].model.pos.y = -25;
		}
		
		if(cubeObjs[objIndex].model.pos.z < 10 || cubeObjs[objIndex].model.pos.z > 550) {
			cubeObjs[objIndex].velocity.z *= -1;
			cubeObjs[objIndex].model.pos.z += cubeObjs[objIndex].velocity.z * deltaTime;
		}
		
		if(cubeObjs[objIndex].model.pos.x < -250 || cubeObjs[objIndex].model.pos.x > 250) {
			cubeObjs[objIndex].velocity.x *= -1;
			cubeObjs[objIndex].model.pos.x += cubeObjs[objIndex].velocity.x * deltaTime;
		}
		cubeObjs[objIndex].velocity.y -= deltaTime * 98;
	}
    
    