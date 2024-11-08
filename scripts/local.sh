# heroku addons:create heroku-postgresql
heroku config -s > .env
echo "DOMAIN=localhost:5001" >> .env
echo "PROTOCOL=http" >> .env
heroku local -p 5001
