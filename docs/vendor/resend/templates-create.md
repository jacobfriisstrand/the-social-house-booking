Source: https://resend.com/docs/api-reference/templates/create-template
Fetched: 2026-08-24

---

# Create Template

Create a new template with optional variables.

`POST /templates`

## Body Parameters

**name** (string, required)
The name of the template.

**html** (string, required)
The HTML version of the template.

**alias** (string)
The alias of the template.

**from** (string)
Sender email address.

To include a friendly name, use the format `"Your Name <sender@domain.com>"`.

If provided, this value can be overridden when sending an email using the template.

**subject** (string)
Default email subject.

This value can be overridden when sending an email using the template.

**reply_to** (string | string[])
Default Reply-to email address. For multiple addresses, send as an array of strings.

This value can be overridden when sending an email using the template.

**text** (string)
The plain text version of the message.

If not provided, the HTML will be used to generate a plain text version. You can opt out of this behavior by setting value to an empty string.

**react** (React.ReactNode)
The React component used to write the template. *Only available in the Node.js SDK.*

**variables** (array)
The array of variables used in the template. Each template may contain up to 50 variables.

Each variable is an object with the following properties:

- **key** (string, required): The key of the variable. Capitalization is recommended (e.g., `PRODUCT_NAME`). Reserved names that cannot be used: `FIRST_NAME`, `LAST_NAME`, `EMAIL`, `RESEND_UNSUBSCRIBE_URL`, `contact`, and `this`.
- **type** ('string' | 'number', required): The type of the variable.
- **fallback_value** (string | number): The fallback value of the variable. Must match the variable's type. If not provided, a value must be supplied when sending an email using the template.

> Before using a template, you must publish it first using the Templates dashboard or the publish template API.

## Request Examples

**Node.js:**
```ts
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

const { data, error } = await resend.templates.create({
  name: 'order-confirmation',
  html: '<p>Name: {{{PRODUCT}}}</p><p>Total: {{{PRICE}}}</p>',
  variables: [
    {
      key: 'PRODUCT',
      type: 'string',
      fallbackValue: 'item',
    },
    {
      key: 'PRICE',
      type: 'number',
      fallbackValue: 25,
    }
  ],
});

// Or create and publish a template in one step
await resend.templates.create({ ... }).publish();
```

**PHP:**
```php
$resend = Resend::client('re_xxxxxxxxx');

$resend->templates->create([
  'name' => 'order-confirmation',
  'html' => '<p>Name: {{{PRODUCT}}}</p><p>Total: {{{PRICE}}}</p>',
  'variables' => [
    [
      'key' => 'PRODUCT',
      'type' => 'string',
      'fallback_value' => 'item',
    ],
    [
      'key' => 'PRICE',
      'type' => 'number',
      'fallback_value' => 25,
    ]
  ],
]);
```

**Python:**
```py
import resend

resend.api_key = "re_xxxxxxxxx"

resend.Templates.create({
    "name": "order-confirmation",
    "html": "<p>Name: {{{PRODUCT}}}</p><p>Total: {{{PRICE}}}</p>",
    "variables": [
        {
            "key": "PRODUCT",
            "type": "string",
            "fallback_value": "item",
        },
        {
            "key": "PRICE",
            "type": "number",
            "fallback_value": 25,
        }
    ],
})
```

**Ruby:**
```ruby
require "resend"

Resend.api_key = "re_xxxxxxxxx"

Resend::Templates.create(
  name: "order-confirmation",
  html: "<p>Name: {{{PRODUCT}}}</p><p>Total: {{{PRICE}}}</p>",
  variables: [
    {
      key: "PRODUCT",
      type: "string",
      fallback_value: "item"
    },
    {
      key: "PRICE",
      type: "number",
      fallback_value: 25
    }
  ]
)
```

**Go:**
```go
package main

import (
	"context"

	"github.com/resend/resend-go/v3"
)

func main() {
	client := resend.NewClient("re_xxxxxxxxx")

	client.Templates.CreateWithContext(context.TODO(), &resend.CreateTemplateRequest{
		Name: "order-confirmation",
		Html: "<p>Name: {{{PRODUCT}}}</p><p>Total: {{{PRICE}}}</p>",
		Variables: []*resend.TemplateVariable{
			{
				Key:           "PRODUCT",
				Type:          resend.VariableTypeString,
				FallbackValue: "item",
			},
			{
				Key:           "PRICE",
				Type:          resend.VariableTypeNumber,
				FallbackValue: 25,
			},
		},
	})
}
```

**Rust:**
```rust
use resend_rs::{
  types::{CreateTemplateOptions, Variable, VariableType},
  Resend, Result,
};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let name = "order-confirmation";
  let html = "<p>Name: {{{PRODUCT}}}</p><p>Total: {{{PRICE}}}</p>";

  let variables = [
    Variable::new("PRODUCT", VariableType::String).with_fallback("item"),
    Variable::new("PRICE", VariableType::Number).with_fallback(25)
  ];

  let opts = CreateTemplateOptions::new(name, html).with_variables(&variables);
  let template = resend.templates.create(opts).await?;

  let _published = resend.templates.publish(&template.id).await?;

  Ok(())
}
```

**Java:**
```java
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        CreateTemplateOptions params = CreateTemplateOptions.builder()
                .name("order-confirmation")
                .html("<p>Name: {{{PRODUCT}}}</p><p>Total: {{{PRICE}}}</p>")
                .addVariable(new Variable("PRODUCT", VariableType.STRING, "item"))
                .addVariable(new Variable("PRICE", VariableType.NUMBER, 25))
                .build();

        CreateTemplateResponseSuccess data = resend.templates().create(params);
    }
}
```

**.NET:**
```csharp
using Resend;

IResend resend = ResendClient.Create("re_xxxxxxxxx");

var variables = new List<TemplateVariable>()
{
  new TemplateVariable() {
    Key = "PRODUCT",
    Type = TemplateVariableType.String,
    Default = "item",
  },
  new TemplateVariable() {
    Key = "PRICE",
    Type = TemplateVariableType.Number,
    Default = 25,
  }
};

var resp = await resend.TemplateCreateAsync(
  new TemplateData()
  {
    Name = "welcome-email",
    HtmlBody = "<strong>Hey, {{{PRODUCT}}}, you are {{{PRICE}}} years old.</strong>",
    Variables = variables,
  }
);

Console.WriteLine($"Template Id={resp.Content}");
```

**cURL:**
```bash
curl -X POST 'https://api.resend.com/templates' \
     -H 'Authorization: Bearer re_xxxxxxxxx' \
     -H 'Content-Type: application/json' \
     -d $'{
  "name": "order-confirmation",
  "html": "<p>Name: {{{PRODUCT}}}</p><p>Total: {{{PRICE}}}</p>",
  "variables": [
    {
      "key": "PRODUCT",
      "type": "string",
      "fallback_value": "item"
    },
    {
      "key": "PRICE",
      "type": "number",
      "fallback_value": 25
    }
  ]
}'
```

**CLI:**
```bash
resend templates create \
  --name order-confirmation \
  --html "<p>Name: {{{PRODUCT}}}</p><p>Total: {{{PRICE}}}</p>" \
  --var PRODUCT:string:item \
  --var PRICE:number:25
```

## Response Example

```json
{
  "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794",
  "object": "template"
}
```
