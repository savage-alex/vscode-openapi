/*
 Copyright (c) 42Crunch Ltd. All rights reserved.
 Licensed under the GNU Affero General Public License version 3. See LICENSE.txt in the project root for license information.
*/

import * as vscode from "vscode";
import { Node } from "@xliic/openapi-ast-node";
import { Cache } from "./cache";
import { configuration } from "./configuration";
import { OpenApiVersion } from "./types";

export const outlines: { [id: string]: vscode.TreeView<Node> } = {};

abstract class OutlineProvider implements vscode.TreeDataProvider<Node> {
  private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

  root: Node;
  maxDepth: number = 1;
  sort: boolean;

  constructor(private context: vscode.ExtensionContext, private cache: Cache) {
    cache.onDidActiveDocumentChange(async (document) => {
      const version = this.cache.getDocumentVersion(document);
      if (version !== OpenApiVersion.Unknown) {
        const pointer = this.getRootPointer();
        const root = await cache.getLastGoodDocumentAst(document);
        if (root && pointer) {
          this.root = root.find(pointer);
        } else if (root) {
          this.root = root;
        } else {
          this.root = null;
        }
      }
      this._onDidChangeTreeData.fire();
    });

    this.sort = configuration.get<boolean>("sortOutlines");
    configuration.onDidChange(this.onConfigurationChanged, this);
  }

  onConfigurationChanged(e: vscode.ConfigurationChangeEvent) {
    if (configuration.changed(e, "sortOutlines")) {
      this.sort = configuration.get<boolean>("sortOutlines");
      this._onDidChangeTreeData.fire();
    }
  }

  getRootPointer(): string {
    return null;
  }

  getChildren(node?: Node): Thenable<Node[]> {
    if (!this.root) {
      return Promise.resolve([]);
    }

    if (!node) {
      node = this.root;
    }

    if (node.getDepth() > this.maxDepth) {
      return Promise.resolve([]);
    }

    return Promise.resolve(this.sortChildren(this.filterChildren(node, node.getChildren())));
  }

  filterChildren(node: Node, children: Node[]) {
    return children;
  }

  sortChildren(children: Node[]) {
    if (this.sort) {
      return children.sort((a, b) => {
        const labelA = this.getLabel(a);
        const labelB = this.getLabel(b);
        return labelA.localeCompare(labelB);
      });
    }
    return children;
  }

  getTreeItem(node: Node): vscode.TreeItem {
    const label = this.getLabel(node);
    const collapsible = this.getCollapsible(node);
    const treeItem = new vscode.TreeItem(label, collapsible);
    treeItem.command = this.getCommand(node);
    treeItem.contextValue = this.getContextValue(node);
    return treeItem;
  }

  getCollapsible(node: Node): vscode.TreeItemCollapsibleState {
    const canDisplayChildren = node.getDepth() < this.maxDepth;
    return canDisplayChildren
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None;
  }

  getLabel(node: Node): string {
    return node ? node.getKey() : "<unknown>";
  }

  getCommand(node: Node): vscode.Command | undefined {
    const editor = vscode.window?.activeTextEditor;
    if (editor && node) {
      const [start, end] = node.getRange();
      return {
        command: "openapi.goToLine",
        title: "",
        arguments: [
          new vscode.Range(editor.document.positionAt(start), editor.document.positionAt(end)),
        ],
      };
    }
    return undefined;
  }

  getContextValue(node: Node) {
    return null;
  }
}

export class PathOutlineProvider extends OutlineProvider {
  maxDepth = 5;

  getRootPointer() {
    return "/paths";
  }

  filterChildren(node: Node, children: Node[]) {
    const depth = node.getDepth();
    const key = node.getKey();
    if (depth === 2) {
      return children.filter((child) => {
        return [
          "get",
          "put",
          "post",
          "delete",
          "options",
          "head",
          "patch",
          "trace",
          "parameters",
        ].includes(child.getKey());
      });
    } else if (depth === 3 && key !== "parameters") {
      return children.filter((child) => {
        const key = child.getKey();
        return key === "responses" || key === "parameters";
      });
    }
    return children;
  }

  getLabel(node: Node): string {
    const depth = node.getDepth();

    if ((depth === 4 || depth === 5) && node.getParent().getKey() == "parameters") {
      // return label for a parameter
      const ref = node.find("/$ref");
      const name = node.find("/name");
      const label = (ref && ref.getValue()) || (name && name.getValue());
      if (!label) {
        return "<unknown>";
      }
      return label;
    }
    return node.getKey();
  }

  getContextValue(node: Node) {
    if (node.getDepth() === 2) {
      return "path";
    }
    return null;
  }
}

export class DefinitionOutlineProvider extends OutlineProvider {
  getRootPointer() {
    return "/definitions";
  }
}

export class SecurityDefinitionOutlineProvider extends OutlineProvider {
  getRootPointer() {
    return "/securityDefinitions";
  }
}

export class SecurityOutlineProvider extends OutlineProvider {
  getRootPointer() {
    return "/security";
  }

  getLabel(node: Node): string {
    const children = node.getChildren();
    if (children[0]) {
      return children[0].getKey();
    }
    return "<unknown>";
  }
}

export class ComponentsOutlineProvider extends OutlineProvider {
  maxDepth = 3;
  getRootPointer() {
    return "/components";
  }
}

export class ServersOutlineProvider extends OutlineProvider {
  getRootPointer() {
    return "/servers";
  }

  getLabel(node: Node): string {
    for (const child of node.getChildren()) {
      if (child.getKey() === "url") {
        const label = child.getValue();
        if (!label) {
          return "<unknown>";
        }
        return label;
      }
    }
    return "<unknown>";
  }
}

export class ParametersOutlineProvider extends OutlineProvider {
  getRootPointer() {
    return "/parameters";
  }
}

export class ResponsesOutlineProvider extends OutlineProvider {
  getRootPointer() {
    return "/responses";
  }
}

export class GeneralTwoOutlineProvider extends OutlineProvider {
  getChildren(node?: Node): Thenable<Node[]> {
    const targets = [
      "/swagger",
      "/host",
      "/basePath",
      "/info",
      "/schemes",
      "/consumes",
      "/produces",
      "/tags",
      "/externalDocs",
    ];

    const result = [];

    if (this.root) {
      for (const pointer of targets) {
        const node = this.root.find(pointer);
        if (node) {
          result.push(node);
        }
      }
    }

    return Promise.resolve(result);
  }
}

export class GeneralThreeOutlineProvider extends OutlineProvider {
  getChildren(node?: Node): Thenable<Node[]> {
    const targets = ["/openapi", "/info", "/tags", "/externalDocs"];

    const result = [];

    if (this.root) {
      for (const pointer of targets) {
        const node = this.root.find(pointer);
        if (node) {
          result.push(node);
        }
      }
    }
    return Promise.resolve(result);
  }
}

function registerOutlineTreeView(id: string, provider: vscode.TreeDataProvider<Node>): void {
  outlines[id] = vscode.window.createTreeView(id, {
    treeDataProvider: provider,
  });
  // Length is 0 if deselected
  outlines[id].onDidChangeSelection((event) => {
    vscode.commands.executeCommand("setContext", id + "Selected", event.selection.length > 0);
  });
}

export function registerOutlines(
  context: vscode.ExtensionContext,
  cache: Cache
): vscode.Disposable[] {
  // OpenAPI v2 outlines
  registerOutlineTreeView("openapiTwoSpecOutline", new GeneralTwoOutlineProvider(context, cache));
  registerOutlineTreeView("openapiTwoPathOutline", new PathOutlineProvider(context, cache));
  registerOutlineTreeView(
    "openapiTwoDefinitionOutline",
    new DefinitionOutlineProvider(context, cache)
  );
  registerOutlineTreeView("openapiTwoSecurityOutline", new SecurityOutlineProvider(context, cache));
  registerOutlineTreeView(
    "openapiTwoSecurityDefinitionOutline",
    new SecurityDefinitionOutlineProvider(context, cache)
  );
  registerOutlineTreeView(
    "openapiTwoParametersOutline",
    new ParametersOutlineProvider(context, cache)
  );
  registerOutlineTreeView(
    "openapiTwoResponsesOutline",
    new ResponsesOutlineProvider(context, cache)
  );

  // OpenAPI v3 outlines
  registerOutlineTreeView("openapiThreePathOutline", new PathOutlineProvider(context, cache));
  registerOutlineTreeView(
    "openapiThreeSpecOutline",
    new GeneralThreeOutlineProvider(context, cache)
  );
  registerOutlineTreeView(
    "openapiThreeComponentsOutline",
    new ComponentsOutlineProvider(context, cache)
  );
  registerOutlineTreeView(
    "openapiThreeSecurityOutline",
    new SecurityOutlineProvider(context, cache)
  );
  registerOutlineTreeView("openapiThreeServersOutline", new ServersOutlineProvider(context, cache));

  return Object.values(outlines);
}
