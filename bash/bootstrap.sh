#!/bin/bash
export DISPLAY=:0

echo "---------"
echo "BOOTSTRAP"
echo "---------"

#cd /home/pi/valve
chmod +x -R *

import_folder="rpi_update"

### DECLARATION PART

function list_through_files {

	folder="$1"

	for a in "$folder/"* ; do

		if [ -d "$a" ] ; then
			if [ "$a" == "$folder/video" ] ; then
				update_assets "$a"
			else
				echo "COPING $a"
				gcp --force --recursive "$a" "./"
			fi
		else
			echo "COPING $a"
			gcp --force --recursive "$a" "./"
		fi
	done


}

##updates assets in up-to-date fashion
function update_assets {

	folder="$1"

	for v in "$folder/"* ; do

		if [ ! -d "$v" ] ; then
			if [ ! -f "./assets/$(basename "$v")" ] ; then
				echo "COPING $v"
				gcp "$v" "./assets/$(basename "$v")"

			fi
		else
			echo "COPING $v"
			gcp "$v" "./assets/$(basename "$v")"
		fi

	done

	for w in "./assets/"* ; do
		if [ ! -d "$w" ]; then
			if [ ! -f "$folder/$(basename "$w")" ] ; then
				echo "REMOVING $w"
				rm  "$w"
			fi
		fi
	done

}

### LOGIC PART


if [ ! -d assets ]
then
	echo "creating assets directory"
	mkdir assets
	chmod +x assets
fi


sleep 10

echo "CHECKING FOR FILES TO UPDATE..."

for i in /media/* ; do

  if [ -d "$i/$import_folder/" ]; then

	echo "$i/$import_folder"

	list_through_files "$i/$import_folder"


  fi


  for j in "$i/"* ; do

     if [ -d "$j/$import_folder/" ]; then

        echo "$j/$import_folder"

	list_through_files "$j/$import_folder"


    fi

  done


done

chmod +x ./*

echo "PAUSING..."
echo "10"
sleep 5
echo "5"
sleep 1
echo "4"
sleep 1
echo "3"
sleep 1
echo "2"
sleep 1
echo "1"
sleep 1
echo "LIFT OFF!!!"

./valve.sh
