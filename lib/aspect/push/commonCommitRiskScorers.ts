/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    adjustBy,
    PushScorer,
} from "@atomist/sdm-pack-aspect";

export function fileChangeCount(opts: { limitTo: number }): PushScorer {
    return {
        name: "file-change-count",
        scorePush: async pili => ({
            score: adjustBy(pili.filesChanged ? pili.filesChanged.length / opts.limitTo : 0, 1),
        }),
    };
}

export function pomChanged(): PushScorer {
    return {
        name: "pom-changed",
        scorePush: async pili => ({
            score: pili.filesChanged && pili.filesChanged.includes("pom.xml") ? 5 : 1,
        }),
    };
}
