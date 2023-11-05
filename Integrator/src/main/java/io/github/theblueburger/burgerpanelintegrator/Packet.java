package io.github.theblueburger.burgerpanelintegrator;

import org.json.simple.JSONObject;

import java.io.IOException;

public abstract class Packet {
    protected abstract void execute(JSONObject data, String id) throws IOException;
}
