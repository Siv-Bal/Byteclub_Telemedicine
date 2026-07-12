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
                        if (x[0] <= 94.7711410522461) {
                            if (x[1] <= 94.17267990112305) {
                                return 1;
                            }

                            else {
                                if (x[0] <= 54.767704010009766) {
                                    return 3;
                                }

                                else {
                                    if (x[2] <= 37.894235610961914) {
                                        if (x[0] <= 58.38743591308594) {
                                            return 0;
                                        }

                                        else {
                                            return 0;
                                        }
                                    }

                                    else {
                                        if (x[2] <= 38.84748840332031) {
                                            return 4;
                                        }

                                        else {
                                            return 4;
                                        }
                                    }
                                }
                            }
                        }

                        else {
                            if (x[2] <= 37.551639556884766) {
                                if (x[0] <= 116.17389297485352) {
                                    return 2;
                                }

                                else {
                                    return 2;
                                }
                            }

                            else {
                                if (x[3] <= 63.168025970458984) {
                                    return 4;
                                }

                                else {
                                    if (x[3] <= 76.44717025756836) {
                                        if (x[1] <= 97.71398544311523) {
                                            return 5;
                                        }

                                        else {
                                            return 5;
                                        }
                                    }

                                    else {
                                        return 5;
                                    }
                                }
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
                            return "HYPOXIA";
                            case 2:
                            return "TACHYCARDIA";
                            case 3:
                            return "BRADYCARDIA";
                            case 4:
                            return "FEVER";
                            case 5:
                            return "HEAT_STRESS";
                            default:
                            return "Houston we have a problem";
                        }
                    }

                protected:
                };
            }
        }
    }