#pragma once
#include <cstdarg>
namespace Eloquent {
    namespace ML {
        namespace Port {
            class DecisionTree {
                public:
                    /**
                    * Predict class for features vector
                    */
                    int predict(float *x) {
                        if (x[0] <= 95.95197296142578) {
                            if (x[1] <= 0.139530248939991) {
                                if (x[0] <= 56.398677825927734) {
                                    if (x[1] <= 0.08573930338025093) {
                                        return 2;
                                    }

                                    else {
                                        return 2;
                                    }
                                }

                                else {
                                    if (x[2] <= 127.72138214111328) {
                                        if (x[0] <= 61.226783752441406) {
                                            return 0;
                                        }

                                        else {
                                            return 0;
                                        }
                                    }

                                    else {
                                        return 4;
                                    }
                                }
                            }

                            else {
                                return 3;
                            }
                        }

                        else {
                            if (x[2] <= 120.20744705200195) {
                                return 1;
                            }

                            else {
                                return 4;
                            }
                        }
                    }

                    /**
                    * Predict readable class name
                    */
                    const char* predictLabel(float *x) {
                        return idxToLabel(predict(x));
                    }

                    /**
                    * Convert class idx to readable name
                    */
                    const char* idxToLabel(uint8_t classIdx) {
                        switch (classIdx) {
                            case 0:
                            return "NORMAL";
                            case 1:
                            return "TACHYCARDIA";
                            case 2:
                            return "BRADYCARDIA";
                            case 3:
                            return "ARRHYTHMIA_SUSPECTED";
                            case 4:
                            return "RESP_DISTRESS";
                            default:
                            return "Houston we have a problem";
                        }
                    }

                protected:
                };
            }
        }
    }