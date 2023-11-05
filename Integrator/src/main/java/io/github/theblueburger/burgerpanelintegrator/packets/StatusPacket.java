package io.github.theblueburger.burgerpanelintegrator.packets;

import io.github.theblueburger.burgerpanelintegrator.BurgerPanelIntegrator;
import io.github.theblueburger.burgerpanelintegrator.Packet;
import org.bukkit.Bukkit;
import org.json.simple.JSONObject;

import java.io.IOException;

public class StatusPacket extends Packet {
    @Override
    protected void execute(JSONObject data, String id) throws IOException {
        JSONObject responseObj = new JSONObject();
        responseObj.put("tps", Bukkit.getServer().getTPS()[0]);
        BurgerPanelIntegrator.respond(id, responseObj);
    }
}
