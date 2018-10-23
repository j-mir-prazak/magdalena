#!/bin/bash
cd /home/pi/metropol
# set here the path to the directory containing your videos
VideoLocation="./video"

# you can probably leave this alone
Process="omxplayer"
# our loop
while true; do
        if ps ax | grep -v grep | grep $Process > /dev/null
        then
        sleep 1;
else
        for entry in "$VideoLocation/"*
        do
		xset dpms force off
                
                # -r for stretched over the entire location
		echo "$entry"
                omxplayer -b -o both "$entry" > /dev/null
		xset dpms force off
        done
fi
done

