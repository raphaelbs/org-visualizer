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
    FeatureManager,
    FingerprintCensus,
    FingerprintStatus,
    HasFingerprints,
    IdealResolver,
    isHasFingerprints,
    ManagedFeature,
} from "./FeatureManager";

import {
    FP,
    PossibleIdeal,
} from "@atomist/sdm-pack-fingerprints";
import * as _ from "lodash";
import { CSSProperties } from "react";
import { ProjectAnalysisResult } from "../analysis/ProjectAnalysisResult";

export function allFingerprints(ar: HasFingerprints | HasFingerprints[]): FP[] {
    return _.flatMap(toArray(ar), arr => Object.getOwnPropertyNames(arr.fingerprints)
        .map(name => arr.fingerprints[name]));
}

function toArray<T>(value: T | T[]): T[] {
    if (!!value) {
        if (Array.isArray(value)) {
            return value;
        } else {
            return [value];
        }
    } else {
        return undefined;
    }
}

export async function* fingerprintsFrom(ar: HasFingerprints[] | AsyncIterable<HasFingerprints>): AsyncIterable<FP> {
    for await (const hf of ar) {
        const fingerprintNames = Object.getOwnPropertyNames(hf.fingerprints);
        for (const name of fingerprintNames) {
            yield hf.fingerprints[name];
        }
    }
}

export type MelbaFingerprintForDisplay = FP & {
    ideal?: PossibleIdeal,
    displayValue: string,
    displayName: string,
};

export interface MelbaFeatureForDisplay {
    feature: ManagedFeature;
    fingerprints: MelbaFingerprintForDisplay[];
}

/**
 * Features must have unique names
 */
export class DefaultFeatureManager implements FeatureManager {

    public readonly features: ManagedFeature[] = [];

    public featureFor(fp: FP): ManagedFeature | undefined {
        return !!fp ? this.features.find(f => f.selector(fp)) : undefined;
    }

    public managedFingerprintNames(results: HasFingerprints[]): string[] {
        const fingerprints: FP[] = _.flatMap(results, allFingerprints);
        const relevantFingerprints = fingerprints.filter(fp => this.features.some(feature => feature.selector(fp)));
        return _.uniq(relevantFingerprints.map(fp => fp.name));
    }

    public async fingerprintCensus(repos: HasFingerprints[]): Promise<FingerprintCensus> {
        const result: FingerprintCensus = {
            projectsAnalyzed: repos.length,
            features: [],
        };
        const allFingerprintsInAllProjects: FP[] = _.flatMap(repos, allFingerprints);
        for (const feature of this.features) {
            const names = _.uniq(allFingerprintsInAllProjects.filter(fp => feature.selector(fp)).map(fp => fp.name));
            const fingerprints: FingerprintStatus[] = [];
            for (const name of names) {
                fingerprints.push({
                    name,
                    appearsIn: allFingerprintsInAllProjects.filter(fp => fp.name === name).length,
                    variants: _.uniq(allFingerprintsInAllProjects.filter(fp => fp.name === name).map(fp => fp.sha)).length,
                    ideal: await this.idealResolver(name),
                    featureName: feature.displayName,
                    displayName: defaultedToDisplayableFingerprintName(feature)(name),
                });
            }
            result.features.push({
                feature,
                fingerprints: fingerprints
                    .sort((a, b) => b.appearsIn - a.appearsIn)
                    .sort((a, b) => b.variants - a.variants),
            });
        }
        return result;
    }

    public async projectFingerprints(par: ProjectAnalysisResult): Promise<MelbaFeatureForDisplay[]> {
        const result = [];
        const allFingerprintsInOneProject: FP[] = allFingerprints(par.analysis);
        for (const feature of this.features) {
            const originalFingerprints = allFingerprintsInOneProject.filter(fp => feature.selector(fp));
            if (originalFingerprints.length > 0) {
                const fingerprints: MelbaFingerprintForDisplay[] = [];
                for (const fp of originalFingerprints) {
                    fingerprints.push({
                        ...fp,
                        ideal: await this.idealResolver(fp.name),
                        displayValue: defaultedToDisplayableFingerprint(feature)(fp),
                        displayName: defaultedToDisplayableFingerprintName(feature)(fp.name),
                    });
                }
                result.push({
                    feature,
                    fingerprints,
                });
            }
        }
        return result;
    }

    /**
     * Find all the Features we can manage in this project
     */
    public async featuresFound(pa: HasFingerprints): Promise<ManagedFeature[]> {
        return _.uniq(
            _.flatMap(Object.getOwnPropertyNames(pa.fingerprints)
                .map(name => this.features.filter(f => f.selector(pa.fingerprints[name]))),
            ));
    }

    /**
     * Which features could grow in this project that are not already growing.
     * They may not all be present
     */
    public async possibleFeaturesNotFound(analysis: HasFingerprints): Promise<ManagedFeature[]> {
        throw new Error("not implemented");
    }

    public async necessaryFeaturesNotFound(analysis: HasFingerprints): Promise<ManagedFeature[]> {
        throw new Error("not implemented");
    }

    constructor(
        public readonly idealResolver: IdealResolver,
        ...features: ManagedFeature[]
    ) {
        this.features = features;
    }
}

export function defaultedToDisplayableFingerprintName(feature?: ManagedFeature): (fingerprintName: string) => string {
    return (feature && feature.toDisplayableFingerprintName) || (name => name);
}

export function defaultedToDisplayableFingerprint(feature?: ManagedFeature): (fpi: FP) => string {
    return (feature && feature.toDisplayableFingerprint) || (fp => fp && fp.data);
}
