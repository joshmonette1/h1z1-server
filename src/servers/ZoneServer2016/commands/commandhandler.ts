import { ZoneClient2016 as Client } from "../classes/zoneclient";
import { ZoneServer2016 } from "../zoneserver";
import { flhash } from "../../../utils/utils";
import { Command, PermissionLevels } from "./types";
import { commands } from "./commands";
import { internalCommands } from "./internalcommands";

export class CommandHandler {
  readonly commands: { [hash: number]: Command } = {};
  readonly internalCommands: { [name: string]: Command } = {};

  constructor() {
    this.indexCommands(commands, internalCommands);
  }

  private clientHasCommandPermission(server: ZoneServer2016, client: Client, command: Command) {
    return command.permissionLevel == PermissionLevels.DEFAULT ||
    client.isAdmin // temp permissionLevel logic until isAdmin is replaced
    || server._allowedCommands.includes(command.name)
  }

  private indexCommands(commands: Array<Command>, internalCommands: Array<Command>) {
    commands.forEach((command) => {
      this.commands[flhash(command.name.toUpperCase())] = command;
    });
    internalCommands.forEach((command) => {
      this.internalCommands[command.name] = command;
    });
  }

  executeCommand(server: ZoneServer2016, client: Client, packet: any) {
    const hash = packet.data.commandHash,
      args: string[] = packet.data.arguments.toLowerCase().split(" ");
    if (this.commands[hash]) {
      const command = this.commands[hash];
      if (!this.clientHasCommandPermission(server, client, command)) {
        server.sendChatText(client, "You don't have access to that.");
        return;
      }
      command.execute(server, client, args);
    } else if (hash == flhash("HELP")) {
      server.sendChatText(
        client,
        `Command list: \n/${Object.values(this.commands)
          .filter((command) => this.clientHasCommandPermission(server, client, command))
          .map((command)=> { return command.name })
          .join("\n/")}`
      );
    } else {
      server.sendChatText(client, `Unknown command, hash: ${hash}`);
    }
  }

  executeInternalCommand(
    server: ZoneServer2016,
    client: Client,
    commandName: string,
    packet: any
  ) {
    if (this.internalCommands[commandName]) {
      const command = this.internalCommands[commandName];
      if (!this.clientHasCommandPermission(server, client, command)) {
        server.sendChatText(client, "You don't have access to that.");
        return;
      }
      command.execute(server, client, packet.data);
    } else {
      server.sendChatText(client, `Unknown command: ${commandName}`);
    }
  }

  reloadCommands() {
    delete require.cache[require.resolve("./commands")];
    delete require.cache[require.resolve("./internalCommands")];
    const commands = require("./commands").commands,
    internalCommands = require("./internalCommands").commands;
    this.indexCommands(commands, internalCommands);
  }
}
