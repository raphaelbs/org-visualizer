import { Aspect, FP } from "@atomist/sdm-pack-fingerprints";
import { FileMatchData, microgrammarMatchAspect } from "../compose/fileMatchAspect";
import { microgrammar } from "@atomist/microgrammar";

const targetFrameworksGrammar = microgrammar({
    _open: /<TargetFrameworks?>/,
    targetFramework: /[a-zA-Z0-9_;/.]+/,
    _close: /<\/TargetFrameworks?>/,
});

/**
 * TargetFramework
 * @type {Aspect<FP<FileMatchData>>}
 */
export const CsProjectTargetFrameworks: Aspect<FP<FileMatchData>> =
    microgrammarMatchAspect({
        name: "csproject-targetframeworks",
        displayName: ".csproj TargetFrameworks",
        globs: "*.csproj",
        grammar: targetFrameworksGrammar,
        path: "targetFramework",
    });
