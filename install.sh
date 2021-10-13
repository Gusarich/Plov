echo "
" | sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt-get update

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
nvm install --lts
echo "y
" | sudo apt-get install python3.9
echo "y
" | sudo sudo apt install python3-pip
python3.9 -m pip install requests colorama

git clone https://github.com/Gusarich/Plov.git
cd Plov
npm i bignumber.js tweetnacl tweetnacl-util express body-parser ws sync-fetch
npm i -g wallet
