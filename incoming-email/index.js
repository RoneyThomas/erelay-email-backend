const AWSXRay = require('aws-xray-sdk-core')
const { EmailsModel } = require('./Models/EmailModels');

exports.handler = async function(event, context, callback) {
  // console.log(event)
  // console.log('## EVENT: ' + serialize(event))
  // console.log('## MESSAGE: ' + event["Records"][0]["Sns"]["Message"])
  console.log('Process email');
  const buckets = JSON.parse(event["Records"][0]["Sns"]["Message"])["receipt"]["action"]["bucketName"]
  const keys = JSON.parse(event["Records"][0]["Sns"]["Message"])["receipt"]["action"]["objectKey"]
  const id = JSON.parse(event["Records"][0]["Sns"]["Message"])["receipt"]["recipients"][0]
  const now = new Date;
  const utc_timestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    now.getUTCHours(), now.getUTCMinutes() + 30, now.getUTCSeconds(), now.getUTCMilliseconds());

  console.log(
    {
      "email": JSON.parse(event["Records"][0]["Sns"]["Message"])["receipt"]["recipients"][0],
      buckets,
      keys
    }
  )

  try {
    const exists = await EmailsModel.get({ id });
    if (exists === undefined) {
      const result = await EmailsModel.create({
        id: id,
        keys: [keys],
        ttl: utc_timestamp
      });
      console.log(result)
    } else {
      const result = await EmailsModel.update({
        id: id
      }, {
        keys: [...exists.keys, keys],
        ttl: utc_timestamp
      });
      console.log(result)
    }
  } catch (error) {
    console.log(error);
  }

  // const stream = s3.getObject(params).createReadStream()
  // simpleParser(stream)
  //   .then(parsed => {
  //     // console.log(parsed);
  //     console.log("From ", parsed.from["value"])
  //     console.log("To ", parsed.to["value"])
  //     console.log("Date ", parsed.date)
  //     console.log("Subject ", parsed.subject)
  //     console.log("Body Text ", parsed.text)
  //     console.log("Body Text as HTML ", parsed.textAsHtml)
  //     console.log("Body HTML", parsed.html)
  //     console.log("Attachments ", parsed.attachments)
  //   })
  //   .catch(err => {
  //     console.warn(err);
  //   });
};

var serialize = function(object) {
  return JSON.stringify(object, null, 2)
}