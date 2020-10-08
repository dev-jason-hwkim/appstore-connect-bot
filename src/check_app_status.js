var slack = require("./slack.js");
const Realm = require("realm");
var debug = false;

const AppInfoSchema = {
  name: "AppInfo",
  primaryKey: "appId",
  properties: {
    appId: "string",
    name: "string",
    version: "string",
    status: "string",
    iconUrl: "string",
  },
};

const SubmissionSchema = {
  name: "Submission",
  primaryKey: "appId",
  properties: {
    appId: "string",
    date: "date",
  },
};

let realm = new Realm({
  schema: [AppInfoSchema, SubmissionSchema],
  path: "appstore.realm",
});

function checkAppStatus() {
  console.log("Fetching latest app status...");

  // invoke ruby script to grab latest app status
  var exec = require("child_process").exec;
  exec("ruby src/app-status.rb", function (err, stdout, stderr) {
    if (stdout) {
      // compare new app info with last one (from database)
      console.log(stdout);
      var versions = JSON.parse(stdout);

      for (let version of versions) {
        _checkAppStatus(version);
      }
    } else {
      console.log("There was a problem fetching the status of the app!");
      console.log(stderr);
    }
  });
}

function _checkAppStatus(version) {
  // use the live version if edit version is unavailable
  var currentAppInfo = version["editVersion"]
    ? version["editVersion"]
    : version["liveVersion"];

  var appId = currentAppInfo.appId;

  var lastAppInfo = realm.objectForPrimaryKey("AppInfo", appId);

  if (!lastAppInfo || lastAppInfo.status != currentAppInfo.status || debug) {
    var submissionDate = realm.objectForPrimaryKey("Submission", appId);
    slack.slack(currentAppInfo, submissionDate);

    if (currentAppInfo.status == "Waiting For Review") {
      realm.write(() => {
        realm.create(
          "Submission",
          {
            appId: appId,
            date: new Date(),
          },
          Realm.UpdateMode.All
        );
      });
    }
  } else if (currentAppInfo) {
    console.log(
      `Current status \"${currentAppInfo.status}\" matches previous status. AppName: \"${currentAppInfo.name}\"`
    );
  } else {
    console.log("Could not fetch app status");
  }

  realm.write(() => {
    realm.create(
      "AppInfo",
      {
        appId: currentAppInfo.appId,
        name: currentAppInfo.name,
        version: currentAppInfo.version,
        status: currentAppInfo.status,
        iconUrl: currentAppInfo.iconUrl,
      },
      Realm.UpdateMode.All
    );
  });
}

checkAppStatus();
