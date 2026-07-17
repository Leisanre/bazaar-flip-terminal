package dev.markj.bazaarflip.client;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Config file: config/bazaarflip.json
 * endpoints — every Bazaar Flip Terminal server to send events to
 * (e.g. your local one and the hosted one). The legacy single
 * "endpoint" field is migrated automatically.
 */
public class ModConfig {
	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

	public List<String> endpoints = new ArrayList<>(List.of(
		"http://localhost:4000/api/positions/events",
		"https://bazaar-flip-terminal.onrender.com/api/positions/events"
	));

	// Legacy field from v1 configs; folded into endpoints on load.
	public String endpoint;

	public static ModConfig load() {
		Path path = FabricLoader.getInstance().getConfigDir().resolve("bazaarflip.json");
		ModConfig config = null;
		if (Files.exists(path)) {
			try {
				config = GSON.fromJson(Files.readString(path), ModConfig.class);
			} catch (IOException | RuntimeException e) {
				System.err.println("[bazaarflip] config unreadable, using defaults: " + e);
			}
		}
		if (config == null) config = new ModConfig();

		if (config.endpoints == null) config.endpoints = new ArrayList<>();
		if (config.endpoint != null && !config.endpoints.contains(config.endpoint)) {
			config.endpoints.add(config.endpoint);
		}
		config.endpoint = null;

		try {
			Files.writeString(path, GSON.toJson(config));
		} catch (IOException e) {
			System.err.println("[bazaarflip] could not write config: " + e);
		}
		return config;
	}
}
