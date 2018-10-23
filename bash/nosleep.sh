#!/bin/bash
unclutter -idle 1 &

xset s off # don't activate screensaver
xset -dpms # disable DPMS (Energy Star) features.
xset s noblank # don't blank the video device

while true;
do

	xset dpms force on
	echo nosleep
	sleep 5

done
