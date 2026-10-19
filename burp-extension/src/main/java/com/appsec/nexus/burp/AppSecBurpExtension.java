package com.appsec.nexus.burp;

import burp.api.montoya.BurpExtension;
import burp.api.montoya.MontoyaApi;

/**
 * AppSec Nexus Integration Extension for Burp Suite Community Edition.
 * Uses official PortSwigger Montoya API.
 */
public class AppSecBurpExtension implements BurpExtension {

    @Override
    public void initialize(MontoyaApi api) {
        // Set extension name
        api.extension().setName("AppSec Nexus Connector");

        // Create main UI tab
        AppSecTab appSecTab = new AppSecTab(api);

        // Register Suite Tab in Burp Suite top bar
        api.userInterface().registerSuiteTab("AppSec Nexus", appSecTab);

        // Register Proxy response handler for HTTP interception
        api.proxy().registerResponseHandler(new AppSecProxyHandler(api, appSecTab));

        // Register context menu for HTTP history / Repeater right-click actions
        api.userInterface().registerContextMenuItemsProvider(new AppSecContextMenu(api, appSecTab));

        // Log initialization banner
        api.logging().logToOutput("=================================================");
        api.logging().logToOutput("[AppSec Nexus] Extension loaded successfully.");
        api.logging().logToOutput("[AppSec Nexus] Montoya API initialized.");
        api.logging().logToOutput("[AppSec Nexus] Suite Tab: 'AppSec Nexus' registered.");
        api.logging().logToOutput("[AppSec Nexus] Proxy Interception Handler active.");
        api.logging().logToOutput("[AppSec Nexus] Context Menu: 'Send to AppSec Nexus' registered.");
        api.logging().logToOutput("=================================================");
    }
}
