package io.github.theblueburger.burgerpanelintegrator.packets;

import io.github.theblueburger.burgerpanelintegrator.BurgerPanelIntegrator;
import io.github.theblueburger.burgerpanelintegrator.Packet;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Server;
import org.bukkit.entity.Player;
import org.jetbrains.annotations.NotNull;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import java.io.IOException;
import java.util.Collection;

public class StatusPacket extends Packet {
    @Override
    protected void execute(JSONObject data, String id) throws IOException {
        JSONObject responseObj = new JSONObject();
        Server server = Bukkit.getServer();
        responseObj.put("tps", server.getTPS()[0]);
        Collection<? extends Player> players = server.getOnlinePlayers();
        JSONArray playerArray = new JSONArray();
        for(Player player : players) {
            JSONObject playerObject = new JSONObject();
            playerObject.put("name", player.getName());
            playerObject.put("uuid", player.getUniqueId().toString());
            Location location = player.getLocation();
            JSONObject locationObj = new JSONObject();
            locationObj.put("x", location.getX());
            locationObj.put("y", location.getY());
            locationObj.put("z", location.getZ());
            locationObj.put("world", location.getWorld().getName());
            playerObject.put("position", locationObj);
            playerArray.add(playerObject);
        }
        responseObj.put("players", playerArray);
        BurgerPanelIntegrator.respond(id, responseObj);
    }
}
