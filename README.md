# Feedback

*Feedback* is a Javascript analytics tool that provides feedback on how visitors are interactiving with your website. It sends data from the visitor's browser to a server that you choose (like your own server). It's inspired by Basecamp's Beanstalk analytics, and the objective is to keep user data in-house and off of 3rd-party analytics servers. This was primarily a Javascript and analytics learning exercise.

## Overview

1. To test the setup, visit `http://localhost:8080` in your browser. We're running Nginx on port 8080 on localhost (the development laptop).
1. Nginx serves `index.html` (as well as `feedback.js` and `examples.js`) from the default Nginx root directory, `/usr/local/var/www`. (Copy these 3 files to this directory.) Notice that `index.html` includes both `feedback.js` and `examples.js`, which provide the analytics functionality.
1. When you visit `index.html`, `feedback.js` records presence, page views, and other analytics data that you specify (see `examples.js`) and sends that information to a separate server (climatemojo.com, in this example).
1. The climatemojo.com domain name points to a DigitalOcean server that's running a simple Express HTTP server (`express.js` in this repository). The DigitalOcean Ubuntu server is built using Terraform and the DigitalOcean API. See the Infrastructure repository for details. The Express server simply logs the data it receives to show that `feedback.js` is working as expected.

Note: The steps below aren't 100% complete, but `~/projects/node` is a basic node/express project, with the addition of `express.js` and `climate.png` from this repository.

## Test the Express server on localhost before copying to DigitalOcean

    cd ~/projects/node
    node express.js
    in Chrome, visit: http://localhost/climate.png?site=location

## Copy the Express server from localhost to DigitalOcean

    cd ~/projects/node
    rsync -az -e ssh ./* mojo:/home/yut/node

## Run Express server on DigitalOcean

    cd /home/yut/node
    DEBUG=express:* node express.js

