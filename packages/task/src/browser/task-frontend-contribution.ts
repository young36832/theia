/********************************************************************************
 * Copyright (C) 2017 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { inject, injectable, named } from 'inversify';
import { ILogger, ContributionProvider } from '@theia/core/lib/common';
import { QuickOpenTask, TaskTerminateQuickOpen } from './quick-open-task';
import { CommandContribution, Command, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import {
    FrontendApplication, FrontendApplicationContribution, QuickOpenContribution,
    QuickOpenHandlerRegistry, KeybindingRegistry, KeybindingContribution, StorageService
} from '@theia/core/lib/browser';
import { WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { TaskContribution, TaskResolverRegistry, TaskProviderRegistry } from './task-contribution';
import { TaskService } from './task-service';
import { TerminalMenus } from '@theia/terminal/lib/browser/terminal-frontend-contribution';
import { TaskSchemaUpdater } from './task-schema-updater';
import { TaskConfiguration } from '../common';

export namespace TaskCommands {
    const TASK_CATEGORY = 'Task';
    export const TASK_RUN: Command = {
        id: 'task:run',
        category: TASK_CATEGORY,
        label: 'Run Task...'
    };

    export const TASK_RUN_LAST: Command = {
        id: 'task:run:last',
        category: TASK_CATEGORY,
        label: 'Run Last Task'
    };

    export const TASK_ATTACH: Command = {
        id: 'task:attach',
        category: TASK_CATEGORY,
        label: 'Attach Task...'
    };

    export const TASK_RUN_TEXT: Command = {
        id: 'task:run:text',
        category: TASK_CATEGORY,
        label: 'Run Selected Text'
    };

    export const TASK_CONFIGURE: Command = {
        id: 'task:configure',
        category: TASK_CATEGORY,
        label: 'Configure Tasks...'
    };

    export const TASK_CLEAR_HISTORY: Command = {
        id: 'task:clear-history',
        category: TASK_CATEGORY,
        label: 'Clear History'
    };

    export const TASK_TERMINATE: Command = {
        id: 'task:terminate',
        category: TASK_CATEGORY,
        label: 'Terminate Task'
    };
}

const TASKS_STORAGE_KEY = 'tasks';

@injectable()
export class TaskFrontendContribution implements CommandContribution, MenuContribution, KeybindingContribution, FrontendApplicationContribution, QuickOpenContribution {
    @inject(QuickOpenTask)
    protected readonly quickOpenTask: QuickOpenTask;

    @inject(FrontendApplication)
    protected readonly app: FrontendApplication;

    @inject(ILogger) @named('task')
    protected readonly logger: ILogger;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(ContributionProvider) @named(TaskContribution)
    protected readonly contributionProvider: ContributionProvider<TaskContribution>;

    @inject(TaskProviderRegistry)
    protected readonly taskProviderRegistry: TaskProviderRegistry;

    @inject(TaskResolverRegistry)
    protected readonly taskResolverRegistry: TaskResolverRegistry;

    @inject(TaskService)
    protected readonly taskService: TaskService;

    @inject(TaskSchemaUpdater)
    protected readonly schemaUpdater: TaskSchemaUpdater;

    @inject(StorageService)
    protected readonly storageService: StorageService;

    @inject(TaskTerminateQuickOpen)
    protected readonly taskTerminateQuickOpen: TaskTerminateQuickOpen;

    onStart(): void {
        this.contributionProvider.getContributions().forEach(contrib => {
            if (contrib.registerResolvers) {
                contrib.registerResolvers(this.taskResolverRegistry);
            }
            if (contrib.registerProviders) {
                contrib.registerProviders(this.taskProviderRegistry);
            }
        });
        this.schemaUpdater.update();

        this.storageService.getData<{ recent: TaskConfiguration[] }>(TASKS_STORAGE_KEY, { recent: [] })
            .then(tasks => this.taskService.recentTasks = tasks.recent);
    }

    onStop(): void {
        const recent = this.taskService.recentTasks;
        this.storageService.setData<{ recent: TaskConfiguration[] }>(TASKS_STORAGE_KEY, { recent });
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(
            TaskCommands.TASK_RUN,
            {
                isEnabled: () => true,
                // tslint:disable-next-line:no-any
                execute: (...args: any[]) => {
                    const [source, label] = args;
                    if (source && label) {
                        return this.taskService.run(source, label);
                    }
                    return this.quickOpenTask.open();
                }
            }
        );
        registry.registerCommand(
            TaskCommands.TASK_ATTACH,
            {
                isEnabled: () => true,
                execute: () => this.quickOpenTask.attach()
            }
        );
        registry.registerCommand(
            TaskCommands.TASK_RUN_LAST,
            {
                isEnabled: () => !!this.taskService.getLastTask(),
                execute: () => this.taskService.runLastTask()
            }
        );
        registry.registerCommand(
            TaskCommands.TASK_RUN_TEXT,
            {
                isEnabled: () => true,
                execute: () => this.taskService.runSelectedText()
            }
        );

        registry.registerCommand(
            TaskCommands.TASK_CONFIGURE,
            {
                execute: () => this.quickOpenTask.configure()
            }
        );

        registry.registerCommand(
            TaskCommands.TASK_CLEAR_HISTORY,
            {
                execute: () => this.taskService.clearRecentTasks()
            }
        );

        registry.registerCommand(
            TaskCommands.TASK_TERMINATE,
            {
                execute: () => this.taskTerminateQuickOpen.open()
            }
        );
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(TerminalMenus.TERMINAL_TASKS, {
            commandId: TaskCommands.TASK_RUN.id,
            order: '0'
        });

        menus.registerMenuAction(TerminalMenus.TERMINAL_TASKS, {
            commandId: TaskCommands.TASK_RUN_LAST.id,
            order: '1'
        });

        menus.registerMenuAction(TerminalMenus.TERMINAL_TASKS, {
            commandId: TaskCommands.TASK_ATTACH.id,
            order: '2'
        });

        menus.registerMenuAction(TerminalMenus.TERMINAL_TASKS, {
            commandId: TaskCommands.TASK_RUN_TEXT.id,
            order: '3'
        });

        menus.registerMenuAction(TerminalMenus.TERMINAL_TASKS, {
            commandId: TaskCommands.TASK_CONFIGURE.id,
            order: '4'
        });
    }

    registerQuickOpenHandlers(handlers: QuickOpenHandlerRegistry): void {
        handlers.registerHandler(this.quickOpenTask);
    }

    registerKeybindings(keybindings: KeybindingRegistry): void {
        keybindings.registerKeybinding({
            command: TaskCommands.TASK_RUN_LAST.id,
            keybinding: 'ctrlcmd+shift+k'
        });
    }

}
