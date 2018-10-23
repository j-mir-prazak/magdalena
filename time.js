#!/usr/node
var hours = new Date().getHours();
console.log(hours);

if ( hours < 8 || hours > 20 ) {
	console.log("night");
}
else console.log("day");
