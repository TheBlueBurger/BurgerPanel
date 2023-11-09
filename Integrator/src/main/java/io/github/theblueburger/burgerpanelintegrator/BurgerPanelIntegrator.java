package io.github.theblueburger.burgerpanelintegrator;

import io.github.theblueburger.burgerpanelintegrator.packets.*;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitRunnable;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.slf4j.Logger;

import java.io.IOException;
import java.net.StandardProtocolFamily;
import java.net.UnixDomainSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.AsynchronousCloseException;
import java.nio.channels.SocketChannel;
import java.nio.charset.Charset;
import java.nio.file.Path;
import java.util.ArrayList;

public final class BurgerPanelIntegrator extends JavaPlugin {
    static String burgerpanelID;
    static String burgerpanelSocketPath;
    static Logger logger;
    static SocketChannel client;
    static PacketHandler packetHandler;
    static ArrayList<JSONObject> pendingPackets = new ArrayList<>();
    @Override
    public void onEnable() {
        packetHandler = new PacketHandler();
        packetHandler.addPacket("status", new StatusPacket(), true);
        logger = this.getSLF4JLogger();
        burgerpanelSocketPath = System.getenv("BURGERPANEL_INTEGRATOR_PATH");
        burgerpanelID = System.getenv("BURGERPANEL_INTEGRATOR_SERVER_ID");
        if(burgerpanelID == null || burgerpanelSocketPath == null) {
            logger.error("Can't find server id or integrator path for burgerpanel, is it running from burgerpanel properly?");
            this.setEnabled(false);
            return;
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
        Plugin plugin = this;
        try {
            write(authObj);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        new BukkitRunnable() {
            @Override
            public void run() {
                JSONParser parser = new JSONParser();
                while(true) {
                    int byteCount;
                    ByteBuffer bb = ByteBuffer.allocate(10_000);
                    try {
                        byteCount = client.read(bb);
                    } catch (IOException e) {
                        if(e instanceof AsynchronousCloseException) {
                            break;
                        }
                        throw new RuntimeException(e);
                    }
                    try {
                        String bbString = new String(bb.array(), Charset.defaultCharset()).substring(0, byteCount);
                        logger.info(bbString);
                        JSONObject obj = (JSONObject) parser.parse(bbString);
                        if(packetHandler.canRunAsync(obj)) {
                            new BukkitRunnable() {
                                @Override
                                public void run() {
                                    try {
                                        packetHandler.execute(obj);
                                    } catch (IOException e) {
                                        // TODO Auto-generated catch block
                                        e.printStackTrace();
                                    }
                                }
                                
                            }.runTaskAsynchronously(plugin);
                        } else pendingPackets.add(obj);
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                }
            }
        }.runTaskAsynchronously((Plugin) this);
        new BukkitRunnable() {
            @Override
            public void run() {
                if(pendingPackets.isEmpty()) return;
                ArrayList<JSONObject> toRun = (ArrayList<JSONObject>) pendingPackets.clone();
                pendingPackets.clear();
                toRun.forEach((obj) -> {
                    try {
                        packetHandler.execute(obj);
                    } catch (IOException e) {
                        logger.error(e.getMessage());
                    }
                });
            }
        }.runTaskTimer((Plugin) this, 0, 1);
        logger.info("Connected to the BurgerPanel!");
    }

    @Override
    public void onDisable() {
        try {
            client.close();
        } catch (IOException ignored) {

        }
    }
    static public void write(JSONObject obj) throws IOException {
        client.write(ByteBuffer.wrap(obj.toJSONString().getBytes(Charset.defaultCharset())));
    }
    static public void respond(String id, JSONObject data) throws IOException {
        JSONObject responseObj = new JSONObject();
        responseObj.put("dataType", "response");
        responseObj.put("id", id);
        responseObj.put("data", data);
        write(responseObj);
    }
}
