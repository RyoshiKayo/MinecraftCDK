#!/usr/bin/env bash

WAIT_SEC=30
RCON="/usr/local/bin/mcrcon -H localhost -p rconpassword"

${RCON} -w ${WAIT_SEC} "say ****Server Shutting down in ${WAIT_SEC} seconds****"

RCON_CHECK_TIMEOUT=60
RCON_PORT_CHECK=(/bin/netstat -pantu \| grep '25575' \>/dev/null 2\>\&1)

while ! "${RCON_PORT_CHECK[@]}"
do 
  echo "Waiting for RCON..."
  sleep 5
  RCON_CHECK_TIMEOUT=$((RCON_CHECK_TIMEOUT-5))
  if [[ $RCON_CHECK_TIMEOUT -le 0 ]]
  then
    echo "Timed out while waiting for RCON port!"
    exit 1
  fi
done

for i in $(seq $WAIT_SEC -1 1)
do
  if [[ $i -le 10 ]];then
    ${RCON} "say ****Shutting down in $i****"
  fi;
  sleep 1
done

${RCON} "save-all" stop