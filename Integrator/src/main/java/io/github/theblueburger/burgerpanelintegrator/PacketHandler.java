package io.github.theblueburger.burgerpanelintegrator;

import org.json.simple.JSONObject;

import java.io.IOException;
import java.util.HashMap;

public class PacketHandler {
    HashMap<String, Packet> packets = new HashMap<>();
    void addPacket(String name, Packet packet) {
        packets.put(name, packet);
    }
    void execute(JSONObject data) throws IOException {
        Object packetNameProbablyString = data.get("packet");
        if(!(packetNameProbablyString instanceof String packetName)) {
            BurgerPanelIntegrator.logger.error("BurgerPanel backend sent a invalid packet, .packet isn't a string!");
            return;
        }
        Packet packet = packets.get(packetName);
        if(packet == null) {
            BurgerPanelIntegrator.logger.error("BurgerPanel backend sent a invalid packet, .packet isn't a valid packet!");
            return;
        }
        Object packetID = data.get("id");
        if(!(packetID instanceof String packetIDString)) {
            BurgerPanelIntegrator.logger.error("BurgerPanel backend sent a invalid packet, .id isn't a string!");
            return;
        }
        packet.execute((JSONObject)data.get("data"), packetIDString);
    }
}
