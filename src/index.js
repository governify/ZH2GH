/*
ZH2GH uses ZenHub webhooks to detect when an issue is transferred between different columns and updates the status of the issue in GitHub projects.
https://docs.governify.io/development/services/zh2gh
This is the main file of the service, it contains the code that will be executed when the service is started.
*/
import dotenv from 'dotenv'
dotenv.config()
import http from "http";
import express from "express";
import bodyParser from 'body-parser'
import logger from './utils/logger.js';
import { transactionMiddleware } from './middleware/transactionMiddleware.js';
//------------------------------------------------------------------------------------------------
export const BLUEJAY_STATUS_OPTIONS_NAMES = ["Todo", "In Progress","In Review", "Done"]
export default {}
//------------------------------------------------------------------------------------------------
const app = express()
const port = process.env.PORT || 8080
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));
import BluejayController from './controllers/BluejayController.js';
import BluejayValidator from './validators/BluejayValidator.js';

//START THE SERVER--------------------------------------------------------------------------------
http.createServer(app).listen(port, function () {
  logger.info(`Current log level: ${logger.currentLogLevel}`);
  logger.info("App running at http://localhost:" + port);
  logger.info("When developing, to expose this server to the internet OPEN A NEW TERMINAL and run: \n>>> npm run tunnel");
  logger.info("________________________________________________________________");

});

// ROUTES ---------------------------------------------------------------------------------------
//app.HTTP_TYPE(path, middleware1, middleware2, ..., middlewareN, controller)

app.post('/',
  // This middelware is used to log the messages related to this request with a unique transaction id
  transactionMiddleware,
  //Validator middlewares
  BluejayValidator.validateRequestBody, // New validator
  BluejayValidator.validateZenHubDestinationPipeline,
  BluejayValidator.validateNotEpicTag,
  //Controller
  BluejayController.POST_default)


