const dynamoose = require("dynamoose");

const schema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
    },
    keys: {
      "type": Set,
      "schema": [String]
    },
    ttl: Date
  },
  {
    timestamps: true,
  }
);

const EmailsModel = dynamoose.model("incoming-email", schema, {
  create: false,
  // throughput: {
  //   read: 5,
  //   write: 5,
  // },
  throughput: "ON_DEMAND",
});
module.exports = { EmailsModel };