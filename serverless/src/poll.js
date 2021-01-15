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
  const jsonEvent = JSON.parse(event.body);
  const bodyFmt = [
    'meetingId',
    'title',
    'answers'
  ];
  for (const i in bodyFmt) {
    if (!jsonEvent.hasOwnProperty(bodyFmt[i]))
      return sendResponse(callback, {
        error: `missing property '${bodyFmt[i]}' in the body`
      }, 404);
  }
  const pollId = uuid();
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
  const jsonEvent = JSON.parse(event.body);
  console.log("pollid:", jsonEvent.pollId)
  const result = await ddb.query({
    TableName: process.env.ANSWERPOLL_TABLE_NAME,
    KeyConditionExpression: "#pId = :pollId",
    ExpressionAttributeNames: {
      "#pId": "PollId"
    },
    ExpressionAttributeValues: {
      ":pollId": {
        'S': jsonEvent.pollId
      }
    }
  }).promise();
  const stats = [0, 0, 0, 0];
  for (const i in result.Items)
    stats[parseInt(result.Items[i].ResponseIdx.S)]++;
  sendResponse(callback, {count: result.Count, stats: stats}, 200);
}
