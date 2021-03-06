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

import { ContainerModule } from 'inversify';
import { FrontendApplicationContribution, QuickOpenContribution, KeybindingContribution } from '@theia/core/lib/browser';
import { CommandContribution, MenuContribution, bindContributionProvider } from '@theia/core/lib/common';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging';
import { QuickOpenTask, TaskTerminateQuickOpen } from './quick-open-task';
import { TaskContribution, TaskProviderRegistry, TaskResolverRegistry } from './task-contribution';
import { TaskService } from './task-service';
import { TaskConfigurations } from './task-configurations';
import { ProvidedTaskConfigurations } from './provided-task-configurations';
import { TaskFrontendContribution } from './task-frontend-contribution';
import { createCommonBindings } from '../common/task-common-module';
import { TaskServer, taskPath } from '../common/task-protocol';
import { TaskWatcher } from '../common/task-watcher';
import { bindProcessTaskModule } from './process/process-task-frontend-module';
import { TaskSchemaUpdater } from './task-schema-updater';
import { TaskActionProvider, ConfigureTaskAction } from './task-action-provider';
import '../../src/browser/style/index.css';

export default new ContainerModule(bind => {
    bind(TaskFrontendContribution).toSelf().inSingletonScope();
    bind(TaskService).toSelf().inSingletonScope();
    bind(TaskActionProvider).toSelf().inSingletonScope();
    bind(ConfigureTaskAction).toSelf().inSingletonScope();

    for (const identifier of [FrontendApplicationContribution, CommandContribution, KeybindingContribution, MenuContribution, QuickOpenContribution]) {
        bind(identifier).toService(TaskFrontendContribution);
    }

    bind(QuickOpenTask).toSelf().inSingletonScope();
    bind(TaskTerminateQuickOpen).toSelf().inSingletonScope();
    bind(TaskConfigurations).toSelf().inSingletonScope();
    bind(ProvidedTaskConfigurations).toSelf().inSingletonScope();

    bind(TaskServer).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        const taskWatcher = ctx.container.get(TaskWatcher);
        return connection.createProxy<TaskServer>(taskPath, taskWatcher.getTaskClient());
    }).inSingletonScope();

    createCommonBindings(bind);

    bind(TaskProviderRegistry).toSelf().inSingletonScope();
    bind(TaskResolverRegistry).toSelf().inSingletonScope();
    bindContributionProvider(bind, TaskContribution);
    bind(TaskSchemaUpdater).toSelf().inSingletonScope();

    bindProcessTaskModule(bind);
});
