APP_NAME=`heroku info | head -n 1 | awk '{print $2}'`
# Destroy existing database and create a new one
heroku addons:destroy heroku-postgresql --confirm $APP_NAME --wait
heroku addons:create heroku-postgresql --wait
