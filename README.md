# the evil forum

This project was my final project for CS529 Cloud Application Development for my MS Computer Science program at Willamette University. The goal of the project was to create a Reddit- or Hacker News-style forum to explore hosting an application in the cloud.

## stack

The front-end of the application is written entirely in vanilla CSS and JavaScript, with no dependencies (other than Google Fonts, if you count that). The back-end of the application is a Node/ExpressJS application with a static front-end and a REST API backend.

## APIs and services

I use the following 3rd-party APIs in this application:

* Google API for Sign in with Google/OAuth2
* Mailgun API for sending notification e-mails

The application is proxied behind Cloudflare, which is also used to manage DNS.

## architecture

This application is structured as a monolith with two main subcomponents: the `web` container and the recurring actions (or `recur` container). I took this approach to minimize the overhead that would otherwise be associated with running a serverless application while still avoiding the ma

## configuration

For this application to work, you will need to do the following configuration:

### environment variables

You should set these with [Heroku Config](https://devcenter.heroku.com/articles/config-vars).
```sh
DOMAIN=$YOUR_DOMAIN_NAME
ERROR_PAGE_URL='https://ari-s.com/stassinopoulosari/misc-html/evil-forum-error.html'
GOOGLE_OAUTH2_CLIENT_ID=$YOUR_GOOGLE_CLIENT_ID
GOOGLE_OAUTH2_CLIENT_SECRET=$YOUR_GOOGLE_CLIENT_SECRET
MAILGUN_API_KEY=$YOUR_MAILGUN_API_KEY
MAINTENANCE_PAGE_URL='https://ari-s.com/stassinopoulosari/misc-html/evil-forum-error.html'
PROTOCOL=https
SESSION_SECRET=$YOUR_SESSION_SECRET
```

### database

You will also need to create a Postgres Database with Heroku by running `scripts/reset.sh`.

### running locally

To run the application locally, you will need to run `npm run local`. In order to deploy to Heroku, ou may run `scripts/launch.sh`.

## screenshots

While I have closed the live demo for the Evil Forum, I have included some screenshots of the user interface below:

<table>
  <tr>
    <th>Home Screen</th>
    <th>Profile Page</th>
    <th>Comments (self-post></th>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/883cdb6b-3ce4-4c54-91fe-7d066954f8e0" alt="Home Screen"/>
</td>
    <td><img src="https://github.com/user-attachments/assets/b59f9cce-4380-49f8-96ab-a2fd13c56c99" alt="Profile Page"/>
</td>
    <td>
      <img src="https://github.com/user-attachments/assets/fdd1d5ee-0827-44e3-9507-a6f25866e3ea" alt="Post"/>
    </td>
  </tr>
  <tr>
    <th>New Post</th>
    <th>Comments (link post></th>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/a44c47a7-c489-454a-861d-35a60789c9ab" alt="New Post" />
</td>
    <td><img src="https://github.com/user-attachments/assets/06a9495a-e920-4f22-b186-08e6337aff4c" alt="Comments (link post)" />
</td>
  </tr>
</table>

## questions?

Write me! hello@ari-s.com
