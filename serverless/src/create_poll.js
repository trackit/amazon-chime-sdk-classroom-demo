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

exports.createPoll = async (event, context, callback) => {
  const jsonEvent = JSON.parse(event.body)
  if (jsonEvent == null || !jsonEvent.hasOwnProperty('body'))
    return sendResponse(callback, 'body is missing', 404);
  console.log("body: ", jsonEvent.body);
  const bodyFmt = [
    'meetingId',
    'question',
    'answers'
  ]
  for (const property in bodyFmt) {
    console.log("prop:", property)
    if (!jsonEvent.body.hasOwnProperty(property))
      return sendResponse(callback, `missing property '${property}' in the body`, 404);
  }
  const result = await ddb.putItem({
    TableName: process.env.POLL_TABLE_NAME,
    Item: {
      'MeetingId': {
        S: jsonEvent.meetingId
      },
      'Data': {
        S: JSON.stringify({
          question: jsonEvent.body.question,
          answers: jsonEvent.body.answers
        })
      }
    }
  }).promise();
  console.log(result)
  sendResponse(callback, 'OK', 200);
}
