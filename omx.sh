#!/bin/bash
CURDIR=$(dirname $0)
cd "$CURDIR"
# set here the path to the directory containing your videos
VideoLocation="./assets"


function terminate {

  kill -SIGTRAP $PROC1 2>/dev/null

  kill -SIGTERM $PROC1 2>/dev/null
  kill -SIGTERM $PROC2 2>/dev/null
  kill -SIGTERM $PROC3 2>/dev/null


  kill -SIGINT $PROC1 2>/dev/null
  kill -SIGINT $PROC2 2>/dev/null
	kill -SIGINT $PROC3 2>/dev/null

  echo -e "\e[33m\n\n"
	echo -e "-----------------------------"
	echo -e "      LOOPING TERMINATED.    "
	echo -e "-----------------------------"
	echo -e "\n\n"
	trap SIGTERM
	trap SIGINT

  xset dpms force on

  kill -SIGTERM $$ 2>/dev/null
	}

trap terminate SIGINT
# trap 'echo int; kill -SIGINT $PROC1' SIGINT
trap terminate SIGTERM


for i in /media/*/*/rpi_player
do
  if [ -d $i ]
  then
    for y in $i/assets/*
    do
      if [ -e $y ]
      then
        VideoLocation=/media/*/*/rpi_player/assets
      fi
    done
  fi
done
echo "Video source: "$VideoLocation

# you can probably leave this alone
Process="omxplayer"
# our loop
xset dpms force off
function looping {
  while true;
  do
          if ps ax | grep -v grep | grep $Process > /dev/null
          then
                  echo "omx is running. Sleeping."
                  sleep 1;
          else
                  for entry in $VideoLocation/*
                  do
            		    xset dpms force off
                            # -r for stretched over the entire location
            		    echo "$entry"

                    #volume set by daytime
                    time=$(node time.js)
                    hours=$(echo "$time" | head -n +1)
                    time=$(echo "$time" | tail -n -1)
                    volume=0
                    if [ "$time" == "day" ]
                      then
                        volume=-300
                    elif [ "$time" == "night" ]
                      then
                        volume=-1200
                    fi
                    echo "volume: $volume"

                    omxplayer.bin -b -o both --vol "$volume" "$entry" > /dev/null &
                    PROC1=$!
                    trap 'kill -SIGTRAP $PROC1 2>/dev/null; trap SIGTERM; break; terminate' SIGTERM
                    trap 'kill -SIGTERM $PROC1 2>/dev/null; trap SIGTERM; break; terminate' SIGTERM
                    trap 'kill -SIGINT $PROC1 2>/dev/null; trap SIGINT; break; terminate' SIGINT
                    wait
            		    xset dpms force off
                  done &
                  PROC2=$!
                  trap 'kill -SIGTERM $PROC2 2>/dev/null; trap SIGINT; break; terminate' SIGTERM
                  trap 'kill -SIGINT $PROC2 2>/dev/null; trap SIGINT; break; terminate' SIGINT
                  wait
          fi
  done
}
looping &
PROC3=$!
wait
