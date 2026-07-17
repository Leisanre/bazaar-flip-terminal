package dev.markj.bazaarflip.client;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.message.v1.ClientReceiveMessageEvents;
import net.minecraft.client.Minecraft;

/**
 * Read-only tracker: listens for [Bazaar] chat messages and forwards the raw
 * lines to the local Bazaar Flip Terminal. All parsing happens server-side so
 * new Hypixel wordings never require a mod update.
 */
public class BazaarFlipClient implements ClientModInitializer {

	@Override
	public void onInitializeClient() {
		ModConfig config = ModConfig.load();
		String player = Minecraft.getInstance().getUser().getName();
		EventUploader uploader = new EventUploader(config.endpoints, player);

		ClientReceiveMessageEvents.GAME.register((message, overlay) -> {
			if (overlay) return;
			String text = message.getString();
			// Bazaar order events + NPC shop sells ("You sold Chum x64 for 320 Coins!")
			if (!text.contains("[Bazaar]") && !text.startsWith("You sold ")) return;
			uploader.enqueue(text);
		});

		System.out.println("[bazaarflip] tracking bazaar chat for " + player
			+ " -> " + String.join(", ", config.endpoints));
	}
}
