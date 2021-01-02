#!/usr/bin/env bash

HOME_DIR="/home/ec2-user"

# Install https://github.com/Tiiffi/mcrcon
# This is already downloaded by CDK
cd ${HOME_DIR}/mcrcon || exit
chown -R ec2-user:ec2-user ${HOME_DIR}/mcrcon
make && make install
cd ${HOME_DIR} || exit 

# Mount EBS Volume
VOL_LOC="/dev/xvdw"

FS_CHECK="$(file -s ${VOL_LOC})"
echo "${FS_CHECK}"
if [[ "${FS_CHECK}" == "/dev/xvdw: data" ]]
then
  mkfs -t xfs ${VOL_LOC}
else 
  mkdir -p ${HOME_DIR}/world
  mount ${VOL_LOC} ${HOME_DIR}/world
fi

systemctl daemon-reload
systemctl start minecraft-server
# echo "eula=true" > "${HOME_DIR}/eula.txt"
# sed -i 's/enable-rcon=.*/enable-rcon=true/' "${HOME_DIR}/server.properties"
# sed -i 's/rcon.port=.*/rcon.port=25575/' "${HOME_DIR}/server.properties"
# sed -i 's/rcon.password=.*/rcon.password=rconpassword/' "${HOME_DIR}/server.properties"
# systemctl restart minecraft-server

# Try sleeping 30s to let the server get ready.
RCON_CHECK_TIMEOUT=30
RCON_CHECK='/usr/local/bin/mcrcon -H localhost -p rconpassword "say Testing RCON connection"'
RCON_PORT_CHECK=(/bin/netstat -pantu \| grep '25575' \>/dev/null 2\>\&1)
while ! "${RCON_PORT_CHECK[@]}"
do 
  RCON_CHECK_TIMEOUT=$((RCON_CHECK_TIMEOUT-5));
  
  if "${RCON_CHECK}";
  then
    continue;
  elif [[ RCON_CHECK_TIMEOUT -le 0 ]];then
    echo "RCON test failed!";
    exit 1;
  fi
done

echo "RCON test passed!";
