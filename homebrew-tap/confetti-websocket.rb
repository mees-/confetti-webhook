class ConfettiWebsocket < Formula
  desc "Confetti WebSocket client that runs as a background daemon"
  homepage "https://github.com/mees-/confetti-webhook"
  version "0.1.0"
  license "MIT"

  depends_on "bun"

  # Use the source code repository
  url "https://github.com/mees-/confetti-webhook/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "REPLACE_WITH_ACTUAL_SHA256"

  def install
    # Build from source
    cd "client" do
      system "bun", "install"
      system "bun", "run", "release"
      bin.install "dist/confetti-websocket"
    end
    
    # Create the plist file for launchd
    plist_path = prefix/"homebrew.mxcl.confetti-websocket.plist"
    plist_path.write plist_content
    
    # Install the plist to the user's LaunchAgents directory
    user_plist_path = Dir.home/"Library/LaunchAgents/homebrew.mxcl.confetti-websocket.plist"
    user_plist_path.write plist_content
    
    # Set proper permissions
    system "chmod", "644", user_plist_path.to_s
    
    # Create config directory
    config_dir = Dir.home/".config/confetti-websocket"
    config_dir.mkpath
    
    # Create default config if it doesn't exist
    config_file = config_dir/"config.json"
    unless config_file.exist?
      config_file.write <<~JSON
        {
          "url": "ENTER_WEBSOCKET_URL_HERE"
        }
      JSON
    end
  end

  def post_install
    ohai "Confetti WebSocket client has been installed!"
    puts
    puts "To start the service:"
    puts "  brew services start confetti-websocket"
    puts
    puts "To stop the service:"
    puts "  brew services stop confetti-websocket"
    puts
    puts "To check service status:"
    puts "  brew services list | grep confetti-websocket"
    puts
    puts "IMPORTANT: You need to grant accessibility permissions in:"
    puts "  System Preferences > Security & Privacy > Privacy > Accessibility"
    puts "  Add the confetti-websocket binary and enable it."
    puts
    puts "Configuration file location:"
    puts "  ~/.config/confetti-websocket/config.json"
    puts
    puts "Please update the WebSocket URL in the config file before starting the service."
  end

  def uninstall
    # Stop the service if it's running
    system "brew", "services", "stop", "confetti-websocket"
    
    # Remove the plist from LaunchAgents
    user_plist_path = Dir.home/"Library/LaunchAgents/homebrew.mxcl.confetti-websocket.plist"
    user_plist_path.delete if user_plist_path.exist?
    
    # Remove the binary
    bin.delete "confetti-websocket"
  end

  service do
    run [opt_bin/"confetti-websocket"]
    keep_alive true
    log_path var/"log/confetti-websocket.log"
    error_log_path var/"log/confetti-websocket.log"
    working_dir Dir.home
    environment_variables PATH: "#{HOMEBREW_PREFIX}/bin:/usr/bin:/bin"
  end

  private

  def plist_content
    <<~XML
      <?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
      <plist version="1.0">
      <dict>
          <key>Label</key>
          <string>homebrew.mxcl.confetti-websocket</string>
          <key>ProgramArguments</key>
          <array>
              <string>#{opt_bin}/confetti-websocket</string>
          </array>
          <key>RunAtLoad</key>
          <true/>
          <key>KeepAlive</key>
          <true/>
          <key>StandardOutPath</key>
          <string>#{var}/log/confetti-websocket.log</string>
          <key>StandardErrorPath</key>
          <string>#{var}/log/confetti-websocket.log</string>
          <key>WorkingDirectory</key>
          <string>#{Dir.home}</string>
          <key>EnvironmentVariables</key>
          <dict>
              <key>PATH</key>
              <string>#{HOMEBREW_PREFIX}/bin:/usr/bin:/bin</string>
          </dict>
      </dict>
      </plist>
    XML
  end

  test do
    # Test that the binary exists and is executable
    assert_predicate bin/"confetti-websocket", :exist?
    assert_predicate bin/"confetti-websocket", :executable?
    
    # Test help output
    output = shell_output("#{bin}/confetti-websocket --help", 0)
    assert_match "Usage:", output
  end
end
