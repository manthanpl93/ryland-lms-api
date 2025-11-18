#!/bin/bash
whoami
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
cd ~/.nvm/versions/node/v20.10.0/bin/
pm2 stop all
cd /home/pm2user/xtcare-lms-api && git pull origin master
yarn && yarn compile
pm2 restart all
