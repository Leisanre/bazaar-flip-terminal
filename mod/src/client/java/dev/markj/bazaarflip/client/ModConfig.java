package dev.markj.bazaarflip.client;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Config file: config/bazaarflip.json
 * endpoint — where the Bazaar Flip Terminal server listens.
 */
public class ModConfig {
	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

	public String endpoint = "http://localhost:4000/api/positions/events";

	public static ModConfig load() {
		Path path = FabricLoader.getInstance().getConfigDir().resolve("bazaarflip.json");
		if (Files.exists(path)) {
			try {
				return GSON.fromJson(Files.readString(path), ModConfig.class);
			} catch (IOException | RuntimeException e) {
				System.err.println("[bazaarflip] config unreadable, using defaults: " + e);
			}
		}
		ModConfig config = new ModConfig();
		try {
			Files.writeString(path, GSON.toJson(config));
		} catch (IOException e) {
			System.err.println("[bazaarflip] could not write default config: " + e);
		}
		return config;
	}
}
