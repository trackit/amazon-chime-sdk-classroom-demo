const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB();

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatResponse(body, code) {
  return {
    "statusCode": code,
    "headers": {},
    "body": JSON.stringify(body),
    "isBase64Encoded": false
  };
}

function sendResponse(callback, message, code) {
  if (code !== 200)
    console.warn(message);
  callback(null, formatResponse(message, code));
}

exports.answerPoll = async (event, context, callback) => {
  const jsonEvent = JSON.parse(event.body);
  const bodyFmt = [
    'pollId',
    'answerIdx',
  ];
  for (const i in bodyFmt) {
    console.log("prop:", bodyFmt[i]);
    if (!jsonEvent.hasOwnProperty(bodyFmt[i]))
      return sendResponse(callback, {
        error: `missing property '${bodyFmt[i]}' in the body`
      }, 404);
  }
  await ddb.putItem({
    TableName: process.env.ANSWERPOLL_TABLE_NAME,
    Item: {
      'PollId': {
        S: jsonEvent.pollId
      },
      'ResponseIdx': {
        S: jsonEvent.answerIdx.toString()
      }
    }
  }).promise();
  sendResponse(callback, {
    status: 'OK'
  }, 200);
};

const pollState = {
  OPEN: 1,
  CLOSE: 2
}

exports.createPoll = async (event, context, callback) => {
  console.log(event.body);
  const jsonEvent = JSON.parse(event.body);
  console.log("body: ", jsonEvent);
  const bodyFmt = [
    'meetingId',
    'title',
    'answers'
  ];
  for (const i in bodyFmt) {
    console.log("prop:", bodyFmt[i]);
    if (!jsonEvent.hasOwnProperty(bodyFmt[i]))
      return sendResponse(callback, {
        error: `missing property '${bodyFmt[i]}' in the body`
      }, 404);
  }
  const pollId = uuid();
  console.log("beofre puting item");
  await ddb.putItem({
    TableName: process.env.POLL_TABLE_NAME,
    Item: {
      'PollId': {
        S: pollId
      },
      'MeetingId': {
        S: jsonEvent.meetingId
      },
      'Data': {
        S: JSON.stringify({
          question: jsonEvent.question,
          answers: jsonEvent.answers,
          state: pollState.OPEN
        })
      }
    }
  }).promise();
  sendResponse(callback, {
    pollId: pollId
  }, 200);
}


exports.listAnswer = async (event, context, callback) => {

}
