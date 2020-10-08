const moment = require("moment");
const path = require("path");
const { I18n } = require("i18n");
const { IncomingWebhook } = require("@slack/webhook");

const webhookURL = process.env.WEBHOOKS;
const language = process.env.LANGUAGE;
const i18n = new I18n();

i18n.configure({
  locales: ["en", "ko"],
  directory: path.join(__dirname, "../locales"),
});

i18n.setLocale(language);

function postToSlack(appInfo, submissionStartDate) {
  const status = i18n.__(appInfo.status);
  const message = i18n.__("Message", { appname: appInfo.name, status: status });
  const attachment = slackAttachment(appInfo, submissionStartDate);

  const params = {
    attachments: [attachment],
    as_user: "true",
  };

  hook(message, attachment);
}

async function hook(message, attachment) {
  const webhook = new IncomingWebhook(webhookURL, {});
  await webhook.send({
    text: message,
    attachments: [attachment],
  });
}

function slackAttachment(appInfo, submissionStartDate) {
  const status = i18n.__(appInfo.status);
  const fallback = i18n.__("Fallback", {
    appname: appInfo.name,
    status: status,
  });

  var attachment = {
    fallback: fallback,
    title: "AppStore Connect",
    author_name: appInfo.name,
    author_icon: appInfo.iconUrl,
    title_link: `https://itunesconnect.apple.com/WebObjects/iTunesConnect.woa/ra/ng/app/${appInfo.appId}`,
    fields: [
      {
        title: i18n.__("Version"),
        value: appInfo.version,
        short: true,
      },
      {
        title: i18n.__("Status"),
        value: i18n.__(appInfo.status),
        short: true,
      },
    ],
    footer: "AppStore Connect",
    ts: new Date().getTime() / 1000,
  };

  // set elapsed time since "Waiting For Review" start
  if (
    submissionStartDate &&
    appInfo.status != "Prepare for submission" &&
    appInfo.status != "Waiting for review" &&
    appInfo.status != "Ready for sale"
  ) {
    var elapsedHours = moment().diff(moment(submissionStartDate), "hours");

    attachment["fields"].push({
      title: "Elapsed Time",
      value: `${elapsedHours} hours`,
      short: true,
    });
  }

  return attachment;
}

module.exports = {
  slack: postToSlack,
};
