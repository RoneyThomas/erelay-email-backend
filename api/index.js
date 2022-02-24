const AWSXRay = require('aws-xray-sdk-core')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))
const s3 = new AWS.S3({ apiVersion: '2006-03-01' })
const { simpleParser } = require('mailparser')
const generateName = require('./lib/name')
const { EmailsModel } = require('./models/EmailModels');
const crypto = require('crypto');

// const generateId = (userId) => {
//   const hashInput = `${Date.now()}${userId}${Math.floor(Math.random() * 100000)}`
//   const generatedId = SHA256(hashInput, { outputLength: 32 }).toString()
//   return generatedId
// }

exports.handler = async (event) => {
  // TODO implement
  console.log(event)
  console.log(event.headers)
  switch (event.routeKey) {
    case "GET /":
      if (event.headers['set-cookie'] === undefined) {
        console.log("Empty Cookie")
        const email = `${generateName()}@erelay.email`
        const cookieVal = crypto.randomBytes(8).toString('hex')
        const now = new Date;
        const utc_timestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
          now.getUTCHours(), now.getUTCMinutes() + 30, now.getUTCSeconds(), now.getUTCMilliseconds());
        try {
          await EmailsModel.create({
            id: email,
            cookie: cookieVal,
            ttl: utc_timestamp
          });
          const response = {
            headers: {
              "content-type": "application/json",
              'token': cookieVal
            },
            statusCode: 200,
            body: JSON.stringify({ "email": email }),
          };
          return response;
        } catch (error) {
          const response = {
            headers: {
              "content-type": "application/json"
            },
            statusCode: 200,
            body: JSON.stringify({ "errors": `${error}` }),
          };
          return response;
        }

      } else {
        console.log("Not Empty ", event.headers['set-cookie'])
        const response = {
          headers: {
            "content-type": "application/json",
            'token': event.headers['token']
          },
          statusCode: 200,
          body: JSON.stringify({ "message": 'thank you for visiting' }),
        };
        return response;
      }
    case "GET /email":
      // if (event['queryStringParameters'].email !== undefined && event.headers['token'] !== undefined) {
      if (event['queryStringParameters'].email !== undefined && event['queryStringParameters'].token !== undefined) {
        const emails = await EmailsModel.get({ id: event['queryStringParameters'].email })
        if (emails.cookie === event['queryStringParameters'].token) {
          const body = {}
          for (const [index, key] of emails.keys.entries()) {
            console.log("Key ", key);
            try {
              const stream = s3.getObject({
                Bucket: process.env.bucket,
                Key: key
              }).createReadStream()

              // if succeed
              const parsed = await simpleParser(stream)
              // console.log(parsed)
              console.log("From", parsed.from["value"])
              console.log("To", parsed.to["value"])
              console.log("Date", parsed.date)
              console.log("Subject", parsed.subject)
              console.log("Body Text", parsed.text)
              console.log("Body Text as HTML", parsed.textAsHtml)
              console.log("Body HTML", parsed.html)
              console.log("Attachments", parsed.attachments)
              body[index] = {
                "From": parsed.from["value"],
                "To": parsed.to["value"],
                "Date": parsed.date,
                "Subject": parsed.subject,
                "Body Text": parsed.text,
                "Body Text as HTML": parsed.textAsHtml,
                "Body HTML": parsed.html,
                "Attachments": parsed.attachments,
              }
              //   })
              //   .catch(err => {
              //     console.warn(err);
              //     return {
              //       headers: {
              //         "content-type": "application/json",
              //         'cookie': event.headers['set-cookie']
              //       },
              //       statusCode: 404,
              //       body: JSON.stringify({ "message": err }),
              //     }
              //   });
            }
            catch (error) {
              console.warn(error);
              return {
                headers: {
                  "content-type": "application/json",
                  'token': event.headers['token']
                },
                statusCode: 404,
                body: JSON.stringify({ "message": error }),
              }
            }
          }
          const response = {
            headers: {
              "content-type": "application/json",
              'token': event.headers['token']
            },
            statusCode: 200,
            body: JSON.stringify(body),
          };
          return response;
        } else {
          return {
            headers: {
              "content-type": "application/json",
              'token': event.headers['token']
            },
            statusCode: 400,
            body: JSON.stringify({ "message": 'Bad Request' }),
          }
        }
      } else {
        return {
          headers: {
            "content-type": "application/json",
            'token': event.headers['token']
          },
          statusCode: 400,
          body: JSON.stringify({ "message": 'Bad Request' }),
        }
      }
    case "DELETE /email":
      console.log("Delete email being called")
      const emails = await EmailsModel.get({ id: event['queryStringParameters'].email })
      console.log(emails.keys);
      if (emails.keys.size > 1) {
        emails.keys.delete(event['queryStringParameters'].key)
        const result = await EmailsModel.update({
          id: event['queryStringParameters'].email
        }, {
          keys: emails.keys
        });
        console.log(result)
      } else {
        const result = EmailsModel.update({ "id": event['queryStringParameters'].email }, { "$REMOVE": { "keys": null } });
        console.log(result)
      }
      emails.keys.delete(event['queryStringParameters'].key)
      console.log(emails.keys);


  }
};
