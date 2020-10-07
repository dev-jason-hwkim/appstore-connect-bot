require 'spaceship'
require 'json'
require 'tempfile'

def getVersionInfo(app)
    editVersionInfo = app.get_edit_app_store_version
    liveVersionInfo = app.get_live_app_store_version

    version = Hash.new


    icon_url = "https://github.com/%s/blob/master/.github/images/default.png?raw=true" % ENV['GITHUB_REPOSITORY']
    if liveVersionInfo
      icon_url = liveVersionInfo.build.icon_asset_token["templateUrl"]
      icon_url["{w}"] = "340"
      icon_url["{h}"] = "340"
      icon_url["{f}"] = "png"	
    end

    if editVersionInfo      
      version["editVersion"] = {      
        "name" => app.name,
        "version" => editVersionInfo.version_string,
        "status" => editVersionInfo.app_store_state.gsub("_", " ").capitalize,
        "appId" => app.id,
        "iconUrl" => icon_url    
      }      
    end

    if liveVersionInfo
      version["liveVersion"] = {
        "name" => app.name,
        "version" => liveVersionInfo.version_string,
        "status" => liveVersionInfo.app_store_state.gsub("_", " ").capitalize,
        "appId" => app.id,
        "iconUrl" => icon_url
      }
    end

    return version
end


def getAppVersion(bundle_id)
    versions = []
    apps = []
    if bundle_id.empty? == false 
      app = Spaceship::ConnectAPI::App.find(bundle_id) 
      apps.push(app)
    else
      apps = Spaceship::ConnectAPI::App.all
    end

    for app in apps do
      version = getVersionInfo(app)
      versions.push(version)
    end

    return versions
end




p8 = ENV['PRIVATE_KEY'] 
p8_file = Tempfile.new('AuthKey')
p8_file.write(p8)
p8_file.rewind

bundle_id = ENV['BUNDLE_ID']


token = Spaceship::ConnectAPI::Token.create( 
  key_id: ENV['KEY_ID'],
  issuer_id: ENV['ISSUER_ID'],
  filepath: File.absolute_path(p8_file.path)
)

Spaceship::ConnectAPI.token = token

versions = getAppVersion(bundle_id)


puts JSON.dump versions
p8_file.unlink

