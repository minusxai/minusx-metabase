import { TestCheck } from "./types";

export const checkAppState = ({strInFinalAppState, strNotInFinalAppState}: {strInFinalAppState: string, strNotInFinalAppState: string}): TestCheck => {
    return function checkStrInAppState({ initialMinusxState, initialAppState, finalMinusxState, finalAppState }, expect){
        expect(JSON.stringify(finalAppState)).toContain(strInFinalAppState)
        expect(JSON.stringify(finalAppState)).not.toContain(strNotInFinalAppState)
    }
}
