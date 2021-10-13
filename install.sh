echo "
" | sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt-get update

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
nvm install --lts
echo "yes
" | sudo apt-get install python3.9

python3 -m pip install requests colorama
npm install bignumber.js tweetnacl tweetnacl-util express body-parser ws sync-fetch

git clone https://github.com/Gusarich/Plov.git
screen -d -m "node Plov/node/main.js"
