const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB();

function formatResponse(body, code) {
  return {
    "statusCode": code,
    "headers": {},
    "body": body,
    "isBase64Encoded": false
  }
}

function sendResponse(callback, message, code) {
  callback(null, formatResponse(message, code));
}

exports.answerPoll = async (event, context, callback) => {
  const queryParams = [
    'meetingId',
    'pollId',
    'answer',
    'participantId'
  ]
  for (const prop in queryParams) {
    console.log(prop)
    if (event.queryStringParameters.hasOwnProperty(prop))
      return sendResponse(callback, `missing property '${prop}' in query parameter`, 404);
  }
  const result = await ddb.getItem({
    TableName: process.env.POLLANSWER_TABLE_NAME,
    Key: {
      'Title': {
        S: event.queryStringParameters.meetingId
      },
    },
  }).promise();
  sendResponse(callback, 'OK', 200);
}
