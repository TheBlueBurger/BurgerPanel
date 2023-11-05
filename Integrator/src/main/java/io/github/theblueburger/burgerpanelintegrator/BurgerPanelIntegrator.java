package io.github.theblueburger.burgerpanelintegrator;

import org.bukkit.Bukkit;
import org.bukkit.plugin.java.JavaPlugin;
import org.json.simple.JSONObject;
import org.slf4j.Logger;

import java.io.IOException;
import java.net.StandardProtocolFamily;
import java.net.UnixDomainSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.SocketChannel;
import java.nio.charset.Charset;
import java.nio.file.Path;

public final class BurgerPanelIntegrator extends JavaPlugin {
    static String burgerpanelID;
    static String burgerpanelSocketPath;
    static Logger logger;
    SocketChannel client;
    @Override
    public void onEnable() {
        logger = this.getSLF4JLogger();
        burgerpanelSocketPath = System.getenv("BURGERPANEL_INTEGRATOR_PATH");
        burgerpanelID = System.getenv("BURGERPANEL_INTEGRATOR_SERVER_ID");
        if(burgerpanelID == null || burgerpanelSocketPath == null) {
            logger.error("Can't find server id or integrator path for burgerpanel, is it running from burgerpanel properly?");
            this.setEnabled(false);
        }
        Path integratorSocketPath = Path.of(burgerpanelSocketPath);
        UnixDomainSocketAddress socketAddress = UnixDomainSocketAddress.of(integratorSocketPath);
        try {
            client = SocketChannel.open(StandardProtocolFamily.UNIX);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        try {
            client.connect(socketAddress);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        JSONObject authObj = new JSONObject();
        authObj.put("dataType", "request");
        authObj.put("type", "setID");
        authObj.put("id", burgerpanelID);
        try {
            write(authObj);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        logger.info("Connected to the BurgerPanel!");
    }

    @Override
    public void onDisable() {
        // Plugin shutdown logic
    }
    public void write(JSONObject obj) throws IOException {
        client.write(ByteBuffer.wrap(obj.toJSONString().getBytes(Charset.defaultCharset())));
    }
}
