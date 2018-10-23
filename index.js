var spawner = require('child_process')
var StringDecoder = require('string_decoder').StringDecoder
var events = require('events');
var fs = require('fs');

process.on('SIGHUP',  function(){ console.log('CLOSING [SIGHUP]'); process.emit("SIGINT"); })
process.on('SIGINT',  function(){
	 console.log('CLOSING [SIGINT]');
	 for (var i = 0; i < pids.length; i++) {
		console.log("Killing: " + pids[i])
		process.kill(-pids[i])
 	}
	 process.exit(0);
 })
process.on('SIGQUIT', function(){ console.log('CLOSING [SIGQUIT]'); process.emit("SIGINT"); })
process.on('SIGABRT', function(){ console.log('CLOSING [SIGABRT]'); process.emit("SIGINT"); })
process.on('SIGTERM', function(){ console.log('CLOSING [SIGTERM]'); process.emit("SIGINT"); })

var pids = new Array();

function cleanPID(pid) {
	var pid = pid || false
	for (var i = 0; i < pids.length; i++) {
		if ( pids[i] == pid ) pids.splice(i, 1)
	}
}

var omxplayer = require('node-omxplayer')

var ttys = {}

var players = {}

//sets up array with player and its values
function setupPlayer(encoderNum){
	var number = encoderNum
	var asset = "./assets/"+number+".mp3"

	var exists = fs.existsSync(asset);
	if ( ! exists ) {
		console.log(asset + " doesn't exist");
	}
	else {
		console.log(asset + " exists")
		var player = {
		"player": omxplayer("./assets/"+number+".mp3", "local", true, -300),
		"volume": 20,
		"encoder":new Array(),
		"encoderBig":new Array(),
		"number":number,
		"dbus_address":"",
		"max_volume":0.707946,
		"min_volume":0.000707946,
		"setup_done":false
		}

			console.log("player pid: " + player["player"]["pid"])
			pids.push(player["player"]["pid"])
			player["player"].on("close", function() {
				 cleanPID(player["player"]["pid"])
				 console.log(player["number"] + " ended playback")
			 })

			player["player"].on("playback", function() {

				 console.log(player["number"] + " playing playback")

			 })

			 setTimeout(function() {
				 if( player["player"]["open"] ) {
			 		// player["player"].on("playing", function(){
			 			//add logic for dbus_address search
			 			//add dbus_message for lowest volume number search (averages?)
			 			//add dbus_message for setting the volume for the highest

			 			// ---- dbus code ----- //


			 			//gets all dbus destinations
			 			var dbus_destinations = dbusSend();
			 			dbus_destinations.on('done', function() {
			 				var destinations = dbus_destinations.dbus_output
			 				if ( typeof destinations == 'object' && destinations.length > 0) {
			 					//val == dbus destination
			 					destinations.forEach(function(val, index) {
			 						//check pids for destination
			 						var pid = dbusSend("pid", val).on('done', function (destination) {
			 							var destination = destination
			 							if ( player["player"]["pid"] == pid.dbus_output ) {
			 								player["dbus_address"] = destination
			 								console.log("player" + number + " dbus address: " + destination)
											player["setup_done"] = true;
			 							}
			 						//binds destination value for dbusSend("pid"...)
			 						}.bind(this, val))
			 					})
			 				}
			 			})
					}
				}.bind(this), 1500)


			 			// ---- dbus setup done ----- //



		 // })

		return player
	}

	return false
}

function volumeFixer(player, value) {

			var player = player || false;
			var value = value || false;

			if ( ! player ) return false
			if ( ! value ) return false

			if (value == "higher") {
			console.log(player["number"] + " fixing volume to 20");
			player["player"].volDown();
			var getVolume = dbusSend("volume", player["dbus_address"]).on('done', function(){
				if ( getVolume.dbus_output > player["max_volume"] ) {
					console.log(getVolume.dbus_output+":next round")
					volumeFixer(player, "higher")
					}
				else {
					console.log(player["number"]+" fixing resolved")
					player["setup_done"] = true
					}
				})
			}
			else if ( value == "lower") {
				console.log(player["number"] + " fixing volume to 0");
				player["player"].volUp();
				var getVolume = dbusSend("volume", player["dbus_address"]).on('done', function(){
					if ( getVolume.dbus_output < player["min_volume"] ) {
						console.log(getVolume.dbus_output+":next round")
						volumeFixer(player, "lower")
						}
					else {
						console.log(player["number"]+" fixing resolved")
						player["setup_done"] = true
						}
					})
			}
}


function volumeAdjust(player, value) {

	var player = players[player] || false
	var value = value || false

	if ( ! player["setup_done"] ) return false
	if ( ! player["player"]["open"] ) return false

	if ( value == "+" && player["volume"] < 20) {
		player["volume"]++;
		console.log(player["number"]+":volume up:"+player["volume"]);
		player["player"].volUp();

		if ( player["volume"] == 20 ) {
			player["setup_done"] = false;
			var getVolume = dbusSend("volume", player["dbus_address"]).on('done', function(){

				if ( getVolume.dbus_output > player["max_volume"] ) {
					console.log(player["number"] + " volume fixing");
					volumeFixer(player, "higher");
					}
				else player["setup_done"] = true;

				})
			}
		}


	else if ( value == "-" && player["volume"] > 0) {
		player["volume"]--;
		console.log(player["number"]+":volume down:"+player["volume"]);
		player["player"].volDown();

		if ( player["volume"] == 0 ) {
			player["setup_done"] = false;
			var getVolume = dbusSend("volume", player["dbus_address"]).on('done', function(){

				if ( getVolume.dbus_output < player["min_volume"] ) {
					console.log(player["number"] + " volume fixing");
					volumeFixer(player, "lower")
					}
				else player["setup_done"] = true;

				})
			}

		}

}

// parses by two moves and deals with misreads
function parseEverySecondOne(encoderArray){
	var encoder = encoderArray || false;
 	//changed from 3 to 4; arrays indexies too
	if (encoder.length == 4 ) {
		if(encoder[0] == encoder[3]) {
			encoder.splice(1,2)
		}
		else encoder.shift()
	}
	if (encoder.length == 2) {
		if(encoder[0] == encoder[1]) {
			return encoder[1]
			encoder.shift()
			encoder.shift()
			}
		}
	return false
}

function parseEveryTwenty(encoderArray){
	var encoder = encoderArray || false
	var counter = 0
	if (encoder.length == 5 ) {
		for( var i = 1; i < encoder.length; i++ ) {
			if (encoder[0] == encoder[i]) counter++;
		}
		if ( counter >= 4 ) {
			var value = encoder[0]

			encoder.splice(0, encoder.length)
			return value
		}
	encoder.shift()
	}
	return false
}


function cat(tty) {
	var tty = tty || false
	if ( ! tty ) return false

	tty["catstarted"] = true


	var decoder = new StringDecoder('utf8')
	var string = ""

	var stty = spawner.spawn("bash", new Array("./ttySetup.sh", tty["tty"]), {detached: true})
	var cat = spawner.spawn("bash", new Array("./ttyReader.sh", tty["tty"]), {detached: true})
	var ready

	pids.push(stty["pid"])
	stty.on('close', function(){
		cleanPID(stty["pid"])
	})
	pids.push(cat["pid"])

	//periodical checking until the device respondes
	function echoReady() {
		 ready = spawner.spawn("bash", new Array("./ttyReady.sh", tty["tty"]), {detached: true})
		 console.log(tty["tty"] + " was sent 'ready?'")
		 pids.push(ready["pid"])
		 ready.on('close', function(){
			 cleanPID(ready["pid"])
		 })
	}
	echoReady()
	var echo = setInterval(function(){
		echoReady()
	}, 5000)

	cat.stdout.on('data', (data) => {
		string = decoder.write(data)

		string=string.split(/\r?\n/)
		for( var i = 0; i < string.length; i++) {

			if ( string[i].length > 0 && string[i].match(/^system:connected/) && ! tty["comfirmed"]) {
				tty["comfirmed"] = true
				clearInterval(echo)
				console.log(tty["tty"] + " is connected")
			}

			else if ( string[i].length > 0 && string[i].match(/^system:encoders/) && tty["comfirmed"]) {

			 	var encoders = string[i].replace(/^system:encoders:/, "")
				console.log(tty["tty"] + " number of encoders: " + encoders);
				for ( var y = 0; y < encoders; y++ ) {
					var player = setupPlayer(tty["position"] + "" + y)
					if ( player != false ) players[tty["position"] + "" + y] = player
				}
			}

			else if ( string[i].length > 0 && string[i].match(/^encoder/) && tty['comfirmed']) {
				// console.log("real value: " + string[i])
				var split = string[i].split(/:/)

				if ( split.length != 3 || typeof split != "object" ) return false

				var encoderNum = tty["position"] + "" + split[1]-1
				var encoderValue = split[2]

				//pushes the value into the array that holds two or three values
				if ( ! (encoderNum in players) ) {
					// console.log(encoderNum + " player doesn't exist")
					return false
				}
				players[encoderNum]["encoder"].push(encoderValue)

				var value = parseEverySecondOne(players[encoderNum]["encoder"])
				if (value != false) {
					players[encoderNum]["encoderBig"].push(value)
					volumeAdjust(encoderNum, value)
					var bigvalue = parseEveryTwenty(players[encoderNum]["encoderBig"])
					if (bigvalue != false) {
					// console.log("encoder1:" + value)
					}
				}
			}
		}
		// console.log(output)
	});

	cat.stderr.on('data', (data) => {

	  console.log(`stderr: ${data}`)

	});

	cat.on('close', (code) => {

		ready.on('close', function(){
			cleanPID(cat["pid"])
		})


		for (x in players) {

			if ( x >= (tty["position"]*10) && x < ((tty["position"]+1)*10)) {

				if ( "player" in players[x] ) {
					//add pids cleanup after quit()
					if ( players[x]['player']['open'] ) players[x]["player"].quit()
					players[x] = {}

				}
			}
		}
		// console.log("kill ttys")
		console.log(tty["tty"] + " was disconnected. killing all players on this node.")
		delete ttys[tty["tty"]]

	});

	return cat;
}


function ls(search) {
	var search=search || false
	var com = spawner.spawn("bash", new Array("-c", "ls " + search), {detached: true})
	var decoder = new StringDecoder('utf-8')

	pids.push(com["pid"])

	com.stdout.on('data', (data) => {
	  var string = decoder.write(data)
		string=string.split(/\r?\n/)
		for( var i = 0; i < string.length; i++) {
			if ( string[i].length > 0 && typeof ttys[string[i]] === "undefined") {
				var tty = {
					"tty":string[i],
					"comfirmed":false,
					"position":i+1,
					"catstarted":false
				}
				ttys[string[i]] = tty
			}
		}
	});

	//not final state!
	com.stderr.on('data', (data) => {
	  // console.log(`stderr: ${data}`)
	  // var string = decoder.write(data)
		// string = string.replace(/\r?\n$/, "")
		// if ( string.match(/^ls: cannot access/)) console.log(search + " not found")
		// return false
	});

	com.on('close', (code) => {
		cleanPID(com["pid"])

		if (code == 0) {
			for ( i in ttys ) {
				if ( ! ttys[i]["catstarted"] ) {
					console.log(ttys[i])
					cat(ttys[i])
				}
				else "nothing to cat"
			}
		}
		else {
			console.log(search + ' not to be found')
		}
	});

	return com;
}


// ------------------ dbus code ----------------------- //

function dbusSend(command, address, value, pid) {

	var command=command || ""
	var address=address || ""
	var value=value || ""
	var pid=pid || false

	var parameters = ""
	if ( command != "" && value == "" ) parameters = " " + command + " " + address
	else if ( command != "" ) parameters = " " + command + " " + address + " " + value

	var dbus = spawner.spawn("bash", new Array("-c", "./dbus.sh" + parameters), {detached: true})

	var decoder = new StringDecoder('utf-8')

	var dbus_instances = new Array()
	var output = ""
	var dbus_output = new Array()

	pids.push(dbus["pid"])

	dbus.stdout.on('data', (data) => {
	  var string = decoder.write(data)
		string=string.split(/\r?\n/)
		for( var i = 0; i < string.length; i++) {
			if ( string[i].length > 0 ) {
				output+=string[i]+"\r\n"
			}
		}
	});
	//not final state!
	dbus.stderr.on('data', (data) => {
	  console.log(`stderr: ${data}`)
	  // var string = decoder.write(data)
		// string = string.replace(/\r?\n$/, "")
		// if ( string.match(/^ls: cannot access/)) console.log(search + " not found")
		// return false
	});

	dbus.on('close', (code) => {
		cleanPID(dbus["pid"])
		output = output.split(/\r?\n/)
		output.forEach( function( val, index ){
			if ( val == "" ) return false
			var helper = dbusHelper(val, command)
			if ( helper == false ) return false
			dbus_output.push( helper )
			})
		//goes through destinations of dbus instances of (now)"vlc" and then gets pids
		if( command == false ) {
			var dbus_pids = new Array()
			// counter of finished processes
			var counter = 0;
			dbus_output.forEach( function(val, index) {
				var destination = val
				var dbus_command = dbusSend("pid", val).on('done', () => {
					counter++
					var dbus_result = dbus_command["dbus_output"]
					//if it is not an array or is not one item long
					//if return pid doesn't much the one we want
					if ( typeof dbus_result == 'object' && dbus_result.length == 1 && dbus_result[0] != pid ) {
 						dbus_pids.push(destination)
					}
					//when all sub-process are finished
					if ( counter == dbus_output.length ) {
						dbus["dbus_output"] = dbus_pids
						dbus.emit('done')
					}
				})
			})
		}
		//gets pid for destination
		else if ( command == "pid" ) {
			dbus["dbus_output"] = dbus_output
			dbus.emit('done')
		}
		else if ( command == "volume" ) {
			dbus["dbus_output"] = dbus_output
			dbus.emit('done')
		}
		else if ( command == "setVolume" ) {
			dbus["dbus_output"] = "volume " + value + " set for " + pid
			dbus.emit('done')
		}
		else return false
	});

	return dbus;
}

function dbusHelper(val, command) {
	var val = val || false
	var command = command || false

	var string = ""

	if ( command == "pid" || command == "volume") {
		if ( val != "" && val.match(/^\ +/) ) {
			string = val.replace(/.*\ (\d.*)/, "$1")
		}
		else return false
	}
	else if ( command == "setVolume") {
		if ( val != "" && val.match(/^\ +/) ) {
			string = val.replace(/.*\ (\d.*)/, "$1")
		}
		else return false
	}
	else if ( command == false ) {
		//dbus instance we want - now vlc, should be omx
		if ( val.match(/string \".*omxplayer/) ) {
			string = val.replace(/string /, "")
			string = string.replace(/^.*?\"(.*)\"/,"$1")
		}
		else return false
	}
	else return false
	return string
}


// -------------------- calling code ----------------- //

// player1['instance'] = mplayer("vienna_calling_song.mp3")
// player1['instance'].on('close', function() {
// 	console.log("close")
// });

// player2['instance'] = mplayer("Tompa-Ucta.m4a")
// player1.volDown()}, 5000)

ls("/dev/ttyUS*")

setInterval(function(){
	ls("/dev/ttyUS*")
}, 5000)

// ls("input.pipe*")
