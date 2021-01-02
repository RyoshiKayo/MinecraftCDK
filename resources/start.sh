#!/usr/bin/env bash
/usr/bin/java -Xms512M -Xmx"$(t=$(free -m | awk '/Mem:/{print $2}');echo $(((t-t/10))))"M -Xss512M -jar server.jar --forceUpgrade --eraseCache nogui
