/*
 * Copyright 2010-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

/*
 * Expose AWS IoT Embedded Javascript SDK modules
 */
module.exports.device = require('./device');
module.exports.thingShadow = require('./thing');
module.exports.bbqShadowHandler = require('./bbq-meter/bbq-shadow-handler.js');
module.exports.bbqControllerCommHandler = require('./bbq-controller-comm/bbq-controller-handler.js')
