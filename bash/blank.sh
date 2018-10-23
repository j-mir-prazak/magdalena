#!/bin/bash

#xset s off # don't activate screensaver
#xset -dpms # disable DPMS (Energy Star) features.
#xset s noblank # don't blank the video device

while true;
do

	xset dpms force off
	echo blank
	sleep 1

done
